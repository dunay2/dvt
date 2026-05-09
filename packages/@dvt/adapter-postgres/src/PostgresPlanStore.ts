/**
 * Owned concern: adapt scoped plan-store commands and queries to Postgres.
 */
import type {
  ArchivePlanInput,
  IPlanStoreReader,
  IPlanStoreWriter,
  IStoredPlanArtifactStore,
  MarkPlanSupersededInput,
  MarkStoredPlanArtifactInvalidInput,
  ScopedPlanExecutabilityQuery,
  StorePlanArtifactInput,
  StoredPlanArtifact,
} from '@dvt/artifacts';
import {
  type ExecutabilityValidationResult,
  type PlanAdmissionLink,
  type PlanExecutabilityRecord,
  type PlanRefSchemaT,
  type PlanRecord,
  type ScopedPlanId,
  type ScopedPlanRef,
  type PlanValidationRecord,
  parsePlanAdmissionLink,
  parsePlanExecutabilityRecord,
  parsePlanRecord,
  parsePlanRef,
  type PlannerBuildResultV1,
  type RunExecutionPolicy,
} from '@dvt/contracts';
import { Pool, type PoolClient } from 'pg';

import { PostgresPlanAdmissionRepository } from './PostgresPlanStore.admission-repository.js';
import { PostgresPlanExecutabilityRepository } from './PostgresPlanStore.executability-repository.js';
import { PostgresExecutableBlobRepository } from './PostgresPlanStore.executable-blob-repository.js';
import {
  assertStoredPlanMatchesRequest,
  buildExecutionPolicyFromStoredRow,
  buildPlanRecord,
  buildPlanRef,
  buildPlanRefFromStoredRow,
  toPersistedCanonicalPlanJson,
} from './PostgresPlanStore.mappers.js';
import { PostgresPlanRecordRepository } from './PostgresPlanStore.plan-record-repository.js';
import { PostgresPlanStoreSchemaManager } from './PostgresPlanStore.schema-manager.js';
import { PostgresPlanStoreTxRunner } from './PostgresPlanStore.tx.js';
import { composePostgresPlanStore } from './PostgresPlanStoreComposer.js';

export interface ExecutablePlanArtifact {
  readonly text: string;
  readonly schemaVersion: string;
}

export interface PostgresPlanStoreConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  assumeSchemaReady?: boolean;
  toExecutablePlan: (buildResult: PlannerBuildResultV1) => ExecutablePlanArtifact;
}

const PLAN_URI_SCHEME = 'dvt-plan';

export class PostgresPlanStore
  implements IStoredPlanArtifactStore, IPlanStoreWriter, IPlanStoreReader
{
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly txRunner: PostgresPlanStoreTxRunner;
  private readonly schemaManager: PostgresPlanStoreSchemaManager;
  private readonly planRecordRepository: PostgresPlanRecordRepository;
  private readonly planExecutabilityRepository: PostgresPlanExecutabilityRepository;
  private readonly planAdmissionRepository: PostgresPlanAdmissionRepository;
  private readonly executableBlobRepository: PostgresExecutableBlobRepository;

  public constructor(private readonly config: PostgresPlanStoreConfig) {
    const services = composePostgresPlanStore(config);
    this.pool = services.pool;
    this.ownsPool = services.ownsPool;
    this.txRunner = services.txRunner;
    this.schemaManager = services.schemaManager;
    this.planRecordRepository = services.planRecordRepository;
    this.planExecutabilityRepository = services.planExecutabilityRepository;
    this.planAdmissionRepository = services.planAdmissionRepository;
    this.executableBlobRepository = services.executableBlobRepository;
  }

  public async migrate(): Promise<void> {
    await this.schemaManager.migrate();
  }

  public async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  public async storePlanArtifact(input: StorePlanArtifactInput): Promise<PlanRefSchemaT> {
    const { buildResult } = input;
    const executable = this.config.toExecutablePlan(buildResult);
    const executableBytes = Buffer.from(executable.text, 'utf8');
    const planId = buildResult.plan.metadata.planId;
    const canonicalPlanJson = toPersistedCanonicalPlanJson(buildResult);
    const planRef = buildPlanRef({
      planId,
      planVersion: buildResult.plan.metadata.planVersion,
      schemaVersion: executable.schemaVersion,
      executableBytes,
      uriScheme: PLAN_URI_SCHEME,
    });
    const executionPolicy = buildResult.executionPolicy;

    return this.withTransaction(async (client) => {
      const persistedSizeBytes = planRef.sizeBytes ?? executableBytes.byteLength;
      const inserted = await this.executableBlobRepository.insertPendingPlan(client, {
        planId,
        planVersion: planRef.planVersion,
        planUri: planRef.uri,
        planSha256: planRef.sha256,
        ...(executionPolicy.pluginCompatibilityFingerprint === undefined
          ? {}
          : { pluginCompatibilityFingerprint: executionPolicy.pluginCompatibilityFingerprint }),
        schemaVersion: planRef.schemaVersion,
        sizeBytes: persistedSizeBytes,
        requiresCapabilitiesJson: JSON.stringify(executionPolicy.requiresCapabilities ?? null),
        canonicalPlanJson,
        executablePlanJson: executable.text,
      });

      const persisted =
        inserted ??
        (await this.executableBlobRepository.readStoredPlanRowForUpdate(client, planId));
      if (!persisted) {
        throw new Error(`PLAN_STORE_PERSIST_FAILED: ${planId}`);
      }

      assertStoredPlanMatchesRequest(persisted, {
        planRef,
        executionPolicy,
        canonicalPlanJson,
        executablePlanJson: executable.text,
      });

      if (persisted.validation_state !== 'PENDING_VALIDATION') {
        throw new Error(
          `PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED: ${planId}:${persisted.validation_state}`
        );
      }
      await this.planRecordRepository.upsert(client, buildPlanRecord(buildResult, planRef));

      return buildPlanRefFromStoredRow(persisted);
    });
  }

  public async markStoredPlanArtifactValid(input: ScopedPlanRef): Promise<void> {
    await this.transition(input, 'PENDING_VALIDATION', 'VALID', null);
  }

  public async markStoredPlanArtifactInvalid(
    input: MarkStoredPlanArtifactInvalidInput
  ): Promise<void> {
    await this.transition(input, 'PENDING_VALIDATION', 'INVALID', input.report);
  }

  public async createPlanRecord(record: PlanRecord): Promise<void> {
    const validated = parsePlanRecord(record);
    await this.withTransaction(async (client) => {
      await this.planRecordRepository.create(client, validated);
    });
  }

  public async recordExecutability(record: PlanExecutabilityRecord): Promise<void> {
    const validated = parsePlanExecutabilityRecord(record);
    await this.withTransaction(async (client) => {
      await this.planExecutabilityRepository.upsert(client, validated);
    });
  }

  public async markAdmitted(link: PlanAdmissionLink): Promise<void> {
    const validated = parsePlanAdmissionLink(link);
    await this.withTransaction(async (client) => {
      await this.planAdmissionRepository.markAdmitted(client, validated);
    });
  }

  public async markSuperseded(input: MarkPlanSupersededInput): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.planRecordRepository.markSuperseded(client, input);
    });
  }

  public async archivePlan(input: ArchivePlanInput): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.planRecordRepository.archivePlan(client, input);
    });
  }

  public async getPlanRecord(input: ScopedPlanId): Promise<PlanRecord | undefined> {
    return this.withClient(async (client) => {
      const record = await this.planRecordRepository.get(client, input);
      return record ? parsePlanRecord(record) : undefined;
    });
  }

  public async getPlanRecordByRef(input: ScopedPlanRef): Promise<PlanRecord | undefined> {
    const validated = parsePlanRef(input.planRef);
    const record = await this.getPlanRecord({ ...input, planId: validated.planId });
    if (!record) {
      return undefined;
    }
    const mismatches: string[] = [];
    if (record.sourceRef !== validated.uri) mismatches.push('uri');
    if (record.planVersion !== validated.planVersion) mismatches.push('planVersion');
    if (record.schemaVersion !== validated.schemaVersion) mismatches.push('schemaVersion');
    if (mismatches.length > 0) {
      throw new Error(`PLAN_REF_MISMATCH: ${validated.planId}:${mismatches.join(',')}`);
    }
    return record;
  }

  public async listExecutabilityByAdapter(
    input: ScopedPlanExecutabilityQuery
  ): Promise<ReadonlyArray<PlanExecutabilityRecord>> {
    return this.withClient(async (client) => {
      const records = await this.planExecutabilityRepository.listByPlanId(client, input);
      return records.map((record) => parsePlanExecutabilityRecord(record));
    });
  }

  public async getAdmissionLinks(input: ScopedPlanId): Promise<ReadonlyArray<PlanAdmissionLink>> {
    return this.withClient(async (client) => {
      const links = await this.planAdmissionRepository.getByPlanId(client, input);
      return links.map((link) => parsePlanAdmissionLink(link));
    });
  }

  public async getSupersession(
    input: ScopedPlanId
  ): Promise<{ supersededByPlanId: PlanRecord['planId'] } | undefined> {
    return this.withClient(async (client) => {
      return this.planRecordRepository.getSupersession(client, input);
    });
  }

  public async getStoredPlanValidationRecord(
    input: ScopedPlanId
  ): Promise<PlanValidationRecord | undefined> {
    const row = await this.withClient(async (client) => {
      const record = await this.planRecordRepository.get(client, input);
      if (!record) {
        return undefined;
      }
      return this.executableBlobRepository.getValidationRecordRow(client, input.planId);
    });

    if (!row) {
      return undefined;
    }

    return {
      planId: row.plan_id,
      state: row.validation_state,
      storedAtIso: row.stored_at_iso,
      updatedAtIso: row.updated_at_iso,
      ...(row.rejection_report_json !== null && row.rejection_report_json !== undefined
        ? {
            rejectionReport: row.rejection_report_json as ExecutabilityValidationResult & {
              status: 'ERROR';
            },
          }
        : {}),
    };
  }

  public async fetchStoredPlanArtifact(input: ScopedPlanRef): Promise<StoredPlanArtifact> {
    const validated = await this.assertScopedPlanRef(input);
    return this.loadExecutablePlan(validated, ['VALID']);
  }

  public async fetchStoredPlanArtifactForValidation(
    input: ScopedPlanRef
  ): Promise<StoredPlanArtifact> {
    const validated = await this.assertScopedPlanRef(input);
    return this.loadExecutablePlan(validated, ['PENDING_VALIDATION', 'VALID']);
  }

  private async assertScopedPlanRef(input: ScopedPlanRef): Promise<PlanRefSchemaT> {
    const validated = parsePlanRef(input.planRef);
    const record = await this.getPlanRecordByRef(input);
    if (!record) {
      throw new Error(`PLAN_RECORD_NOT_FOUND: ${validated.planId}`);
    }
    return validated;
  }

  private async loadExecutablePlan(
    validated: PlanRefSchemaT,
    allowedStates: ReadonlyArray<'PENDING_VALIDATION' | 'VALID' | 'INVALID'>
  ): Promise<StoredPlanArtifact> {
    const row = await this.withClient(async (client) =>
      this.executableBlobRepository.getExecutablePlanRow(client, validated.planId)
    );

    if (!row) {
      throw new Error(`PLAN_NOT_FOUND: ${validated.planId}`);
    }
    if (!allowedStates.includes(row.validation_state)) {
      throw new Error(`PLAN_NOT_VALID: ${validated.planId}:${row.validation_state}`);
    }

    const executionPolicy: RunExecutionPolicy = buildExecutionPolicyFromStoredRow({
      plugin_compatibility_fingerprint: row.plugin_compatibility_fingerprint,
      requires_capabilities: row.requires_capabilities,
    });

    return {
      bytes: Buffer.from(row.executable_plan_json, 'utf8'),
      executionPolicy,
    };
  }

  private async transition(
    input: ScopedPlanRef,
    expectedState: 'PENDING_VALIDATION',
    nextState: 'VALID' | 'INVALID',
    report: (ExecutabilityValidationResult & { status: 'ERROR' }) | null,
    onTransition?: (client: PoolClient) => Promise<void>
  ): Promise<void> {
    const validated = parsePlanRef(input.planRef);
    await this.withTransaction(async (client) => {
      const record = await this.planRecordRepository.get(client, {
        ...input,
        planId: validated.planId,
      });
      if (!record) {
        throw new Error(`PLAN_RECORD_NOT_FOUND: ${validated.planId}`);
      }
      await this.executableBlobRepository.transitionValidationState(client, {
        planId: validated.planId,
        expectedState,
        nextState,
        report,
      });
      if (onTransition) {
        await onTransition(client);
      }
    });
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.txRunner.withTransaction(fn);
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.txRunner.withClient(fn);
  }
}
