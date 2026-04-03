import type { IPlanStoreReader, IPlanStoreWriter } from '@dvt/artifacts';
import {
  type ExecutabilityValidationResult,
  type IPlanFetcher,
  type IPlanValidationLifecycleStore,
  type PlanAdmissionLink,
  type PlanExecutabilityRecord,
  type PlanRefSchemaT,
  type PlanRecord,
  type PlanValidationRecord,
  parsePlanAdmissionLink,
  parsePlanExecutabilityRecord,
  parsePlanRecord,
  parsePlanRef,
  type PlannerBuildResultV2,
} from '@dvt/contracts';
import { Pool, type PoolClient } from 'pg';

import { PostgresPlanAdmissionRepository } from './PostgresPlanStore.admission-repository.js';
import { PostgresPlanExecutabilityRepository } from './PostgresPlanStore.executability-repository.js';
import {
  assertStoredPlanMatchesRequest,
  buildPlanRecord,
  buildPlanRef,
  buildPlanRefFromStoredRow,
  type StoredPlanRow,
} from './PostgresPlanStore.mappers.js';
import { PostgresPlanRecordRepository } from './PostgresPlanStore.plan-record-repository.js';
import { PostgresPlanStoreSchemaManager } from './PostgresPlanStore.schema-manager.js';
import { PostgresPlanStoreTxRunner } from './PostgresPlanStore.tx.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

export interface ExecutablePlanArtifact {
  readonly text: string;
  readonly schemaVersion: string;
  readonly requiresCapabilities?: readonly string[];
}

export interface PostgresPlanStoreConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  assumeSchemaReady?: boolean;
  toExecutablePlan: (buildResult: PlannerBuildResultV2) => ExecutablePlanArtifact;
}

const PLAN_URI_SCHEME = 'dvt-plan';

export class PostgresPlanStore
  implements IPlanValidationLifecycleStore, IPlanFetcher, IPlanStoreWriter, IPlanStoreReader
{
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly statementTimeoutMs: number;
  private readonly txRunner: PostgresPlanStoreTxRunner;
  private readonly schemaManager: PostgresPlanStoreSchemaManager;
  private readonly planRecordRepository: PostgresPlanRecordRepository;
  private readonly planExecutabilityRepository: PostgresPlanExecutabilityRepository;
  private readonly planAdmissionRepository: PostgresPlanAdmissionRepository;

  public constructor(private readonly config: PostgresPlanStoreConfig) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.statementTimeoutMs =
      config.statementTimeoutMs ?? Number(process.env['DVT_PG_STATEMENT_TIMEOUT_MS'] ?? 0);

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        connectionString:
          config.connectionString ??
          process.env['DVT_PG_URL'] ??
          process.env['DATABASE_URL'] ??
          'postgresql://dvt:dvt@localhost:5432/dvt',
        statement_timeout: this.statementTimeoutMs,
        query_timeout: config.queryTimeoutMs ?? Number(process.env['DVT_PG_QUERY_TIMEOUT_MS'] ?? 0),
      });
      this.ownsPool = true;
    }
    this.txRunner = new PostgresPlanStoreTxRunner(this.pool, this.statementTimeoutMs);
    this.schemaManager = new PostgresPlanStoreSchemaManager(this.schema, this.txRunner);
    this.planRecordRepository = new PostgresPlanRecordRepository(this.schema);
    this.planExecutabilityRepository = new PostgresPlanExecutabilityRepository(this.schema);
    this.planAdmissionRepository = new PostgresPlanAdmissionRepository(this.schema);
  }

  public async migrate(): Promise<void> {
    await this.schemaManager.migrate();
  }

  public async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  public async storePlan(buildResult: PlannerBuildResultV2): Promise<PlanRefSchemaT> {
    const executable = this.config.toExecutablePlan(buildResult);
    const executableBytes = Buffer.from(executable.text, 'utf8');
    const planId = buildResult.plan.metadata.planId;
    const planRef = buildPlanRef({
      planId,
      planVersion: buildResult.plan.metadata.planVersion,
      schemaVersion: executable.schemaVersion,
      executableBytes,
      uriScheme: PLAN_URI_SCHEME,
      ...(executable.requiresCapabilities === undefined
        ? {}
        : { requiresCapabilities: executable.requiresCapabilities }),
    });

    return this.withTransaction(async (client) => {
      const insertResult = await client.query<StoredPlanRow>(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.stored_plans (
            plan_id,
            plan_version,
            plan_uri,
            plan_sha256,
            schema_version,
            size_bytes,
            requires_capabilities,
            canonical_plan_json,
            executable_plan_json,
            validation_state,
            rejection_report_json,
            stored_at,
            updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, 'PENDING_VALIDATION', NULL, NOW(), NOW()
          )
          ON CONFLICT (plan_id) DO NOTHING
          RETURNING
            plan_id,
            plan_version,
            plan_uri,
            plan_sha256,
            schema_version,
            size_bytes,
            requires_capabilities,
            canonical_plan_json,
            executable_plan_json,
            validation_state,
            stored_at::text AS stored_at_iso,
            updated_at::text AS updated_at_iso,
            rejection_report_json
        `,
        [
          planId,
          planRef.planVersion,
          planRef.uri,
          planRef.sha256,
          planRef.schemaVersion,
          planRef.sizeBytes,
          JSON.stringify(planRef.requiresCapabilities ?? null),
          buildResult.canonicalPlanJson,
          executable.text,
        ]
      );

      const persisted =
        insertResult.rows[0] ?? (await this.readStoredPlanRowForUpdate(client, planId));
      if (!persisted) {
        throw new Error(`PLAN_STORE_PERSIST_FAILED: ${planId}`);
      }

      assertStoredPlanMatchesRequest(persisted, {
        planRef,
        canonicalPlanJson: buildResult.canonicalPlanJson,
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

  public async markValid(planRef: PlanRefSchemaT): Promise<void> {
    const validated = parsePlanRef(planRef);
    await this.transition(validated.planId, 'PENDING_VALIDATION', 'VALID', null);
  }

  public async markInvalid(
    planRef: PlanRefSchemaT,
    report: ExecutabilityValidationResult & { status: 'ERROR' }
  ): Promise<void> {
    const validated = parsePlanRef(planRef);
    await this.transition(validated.planId, 'PENDING_VALIDATION', 'INVALID', report);
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

  public async markSuperseded(
    planId: PlanRecord['planId'],
    supersededByPlanId: PlanRecord['planId']
  ): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.planRecordRepository.markSuperseded(client, planId, supersededByPlanId);
    });
  }

  public async archivePlan(planId: PlanRecord['planId'], archivedAtIso: string): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.planRecordRepository.archivePlan(client, planId, archivedAtIso);
    });
  }

  public async getPlanRecord(planId: PlanRecord['planId']): Promise<PlanRecord | undefined> {
    return this.withClient(async (client) => {
      const record = await this.planRecordRepository.get(client, planId);
      return record ? parsePlanRecord(record) : undefined;
    });
  }

  public async getPlanRecordByRef(planRef: PlanRefSchemaT): Promise<PlanRecord | undefined> {
    const validated = parsePlanRef(planRef);
    const record = await this.getPlanRecord(validated.planId);
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
    planId: PlanRecord['planId']
  ): Promise<ReadonlyArray<PlanExecutabilityRecord>> {
    return this.withClient(async (client) => {
      const records = await this.planExecutabilityRepository.listByPlanId(client, planId);
      return records.map((record) => parsePlanExecutabilityRecord(record));
    });
  }

  public async getAdmissionLinks(
    planId: PlanRecord['planId']
  ): Promise<ReadonlyArray<PlanAdmissionLink>> {
    return this.withClient(async (client) => {
      const links = await this.planAdmissionRepository.getByPlanId(client, planId);
      return links.map((link) => parsePlanAdmissionLink(link));
    });
  }

  public async getSupersession(
    planId: PlanRecord['planId']
  ): Promise<{ supersededByPlanId: PlanRecord['planId'] } | undefined> {
    return this.withClient(async (client) => {
      return this.planRecordRepository.getSupersession(client, planId);
    });
  }

  public async getValidationRecord(planId: string): Promise<PlanValidationRecord | undefined> {
    const row = await this.withClient(async (client) => {
      const result = await client.query<StoredPlanRow>(
        `
          SELECT
            plan_id,
            plan_version,
            plan_uri,
            plan_sha256,
            schema_version,
            size_bytes,
            validation_state,
            stored_at::text AS stored_at_iso,
            updated_at::text AS updated_at_iso,
            rejection_report_json
          FROM ${quoteIdentifier(this.schema)}.stored_plans
          WHERE plan_id = $1
        `,
        [planId]
      );
      return result.rows[0];
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

  public async fetch(planRef: PlanRefSchemaT): Promise<Uint8Array> {
    const validated = parsePlanRef(planRef);
    return this.loadExecutablePlan(validated, ['VALID']);
  }

  public async fetchForValidation(planRef: PlanRefSchemaT): Promise<Uint8Array> {
    const validated = parsePlanRef(planRef);
    return this.loadExecutablePlan(validated, ['PENDING_VALIDATION', 'VALID']);
  }

  private async loadExecutablePlan(
    validated: PlanRefSchemaT,
    allowedStates: ReadonlyArray<'PENDING_VALIDATION' | 'VALID' | 'INVALID'>
  ): Promise<Uint8Array> {
    const row = await this.withClient(async (client) => {
      const result = await client.query<{
        executable_plan_json: string;
        validation_state: 'PENDING_VALIDATION' | 'VALID' | 'INVALID';
      }>(
        `
          SELECT executable_plan_json, validation_state
          FROM ${quoteIdentifier(this.schema)}.stored_plans
          WHERE plan_id = $1
        `,
        [validated.planId]
      );
      return result.rows[0];
    });

    if (!row) {
      throw new Error(`PLAN_NOT_FOUND: ${validated.planId}`);
    }
    if (!allowedStates.includes(row.validation_state)) {
      throw new Error(`PLAN_NOT_VALID: ${validated.planId}:${row.validation_state}`);
    }

    return Buffer.from(row.executable_plan_json, 'utf8');
  }

  private async readStoredPlanRowForUpdate(
    client: PoolClient,
    planId: string
  ): Promise<StoredPlanRow | undefined> {
    const result = await client.query<StoredPlanRow>(
      `
        SELECT
          plan_id,
          plan_version,
          plan_uri,
          plan_sha256,
          schema_version,
          size_bytes,
          requires_capabilities,
          canonical_plan_json,
          executable_plan_json,
          validation_state,
          stored_at::text AS stored_at_iso,
          updated_at::text AS updated_at_iso,
          rejection_report_json
        FROM ${quoteIdentifier(this.schema)}.stored_plans
        WHERE plan_id = $1
        FOR UPDATE
      `,
      [planId]
    );
    return result.rows[0];
  }

  private async transition(
    planId: string,
    expectedState: 'PENDING_VALIDATION',
    nextState: 'VALID' | 'INVALID',
    report: (ExecutabilityValidationResult & { status: 'ERROR' }) | null,
    onTransition?: (client: PoolClient) => Promise<void>
  ): Promise<void> {
    await this.withTransaction(async (client) => {
      const current = await client.query<{ validation_state: string }>(
        `
          SELECT validation_state
          FROM ${quoteIdentifier(this.schema)}.stored_plans
          WHERE plan_id = $1
          FOR UPDATE
        `,
        [planId]
      );

      const state = current.rows[0]?.validation_state;
      if (!state) {
        throw new Error(`PLAN_NOT_FOUND: ${planId}`);
      }
      if (state !== expectedState) {
        throw new Error(
          `PLAN_VALIDATION_STATE_INVALID_TRANSITION: ${planId}:${state}->${nextState}`
        );
      }

      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.stored_plans
          SET validation_state = $2,
              rejection_report_json = $3::jsonb,
              updated_at = NOW()
          WHERE plan_id = $1
        `,
        [planId, nextState, JSON.stringify(report)]
      );
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
