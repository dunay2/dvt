import { createHash } from 'node:crypto';

import type { IPlanStoreReader, IPlanStoreWriter } from '@dvt/artifacts';
import {
  type ExecutabilityValidationResult,
  type IPlanFetcher,
  type IPlanValidationLifecycleStore,
  type PlanAdmissionLink,
  type PlanExecutabilityRecord,
  type PlanExecutabilityRejectionReport,
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

type StoredPlanRow = {
  plan_id: string;
  plan_version: string;
  plan_uri: string;
  plan_sha256: string;
  schema_version: string;
  size_bytes: number;
  requires_capabilities?: unknown;
  canonical_plan_json?: string;
  executable_plan_json?: string;
  validation_state: 'PENDING_VALIDATION' | 'VALID' | 'INVALID';
  stored_at_iso: string;
  updated_at_iso: string;
  rejection_report_json: unknown;
};

const PLAN_URI_SCHEME = 'dvt-plan';
const LEGACY_EXECUTABILITY_ADAPTER_ID = '__legacy_validation__';
type ExecutabilityState = 'PENDING' | 'VALID' | 'INVALID';

export class PostgresPlanStore
  implements IPlanValidationLifecycleStore, IPlanFetcher, IPlanStoreWriter, IPlanStoreReader
{
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly statementTimeoutMs: number;

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
  }

  public async migrate(): Promise<void> {
    await this.withTransaction(async (client) => {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.stored_plans (
          plan_id TEXT PRIMARY KEY,
          plan_version TEXT NOT NULL,
          plan_uri TEXT NOT NULL UNIQUE,
          plan_sha256 TEXT NOT NULL,
          schema_version TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          requires_capabilities JSONB,
          canonical_plan_json TEXT NOT NULL,
          executable_plan_json TEXT NOT NULL,
          validation_state TEXT NOT NULL,
          rejection_report_json JSONB,
          stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS stored_plans_validation_state_idx
        ON ${quoteIdentifier(this.schema)}.stored_plans (validation_state, updated_at DESC)
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.plan_records (
          plan_id TEXT PRIMARY KEY,
          canonical_plan_json TEXT NOT NULL,
          canonical_hash TEXT NOT NULL,
          plan_version TEXT NOT NULL,
          schema_version TEXT NOT NULL,
          contract_version TEXT NOT NULL,
          source_ref TEXT NOT NULL,
          state TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          derived_from_plan_id TEXT,
          supersedes_plan_id TEXT,
          archived_at TIMESTAMPTZ
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.plan_executability_records (
          plan_id TEXT NOT NULL REFERENCES ${quoteIdentifier(this.schema)}.plan_records(plan_id) ON DELETE CASCADE,
          adapter_id TEXT NOT NULL,
          state TEXT NOT NULL,
          validated_at TIMESTAMPTZ,
          rejection_report_json JSONB,
          PRIMARY KEY (plan_id, adapter_id)
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.schema)}.plan_admission_links (
          plan_id TEXT NOT NULL REFERENCES ${quoteIdentifier(this.schema)}.plan_records(plan_id) ON DELETE CASCADE,
          run_id TEXT NOT NULL,
          adapter_id TEXT NOT NULL,
          admitted_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (plan_id, run_id, adapter_id)
        )
      `);
      await client.query(`
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_records (
          plan_id,
          canonical_plan_json,
          canonical_hash,
          plan_version,
          schema_version,
          contract_version,
          source_ref,
          state,
          created_at,
          updated_at
        )
        SELECT
          sp.plan_id,
          sp.canonical_plan_json,
          sp.plan_sha256,
          sp.plan_version,
          sp.schema_version,
          COALESCE((sp.canonical_plan_json::jsonb #>> '{metadata,contractVersion}'), '1.0.0'),
          sp.plan_uri,
          'ACTIVE',
          sp.stored_at,
          sp.updated_at
        FROM ${quoteIdentifier(this.schema)}.stored_plans sp
        ON CONFLICT (plan_id) DO NOTHING
      `);
      await client.query(
        `
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_executability_records (
          plan_id,
          adapter_id,
          state,
          validated_at,
          rejection_report_json
        )
        SELECT
          sp.plan_id,
          $1,
          CASE sp.validation_state
            WHEN 'PENDING_VALIDATION' THEN 'PENDING'
            WHEN 'VALID' THEN 'VALID'
            ELSE 'INVALID'
          END,
          CASE WHEN sp.validation_state = 'PENDING_VALIDATION' THEN NULL ELSE sp.updated_at END,
          sp.rejection_report_json
        FROM ${quoteIdentifier(this.schema)}.stored_plans sp
        ON CONFLICT (plan_id, adapter_id) DO NOTHING
      `,
        [LEGACY_EXECUTABILITY_ADAPTER_ID]
      );
    });
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
      await this.upsertPlanRecord(client, buildPlanRecord(buildResult, planRef));

      return buildPlanRefFromStoredRow(persisted);
    });
  }

  public async markValid(planRef: PlanRefSchemaT): Promise<void> {
    const validated = parsePlanRef(planRef);
    const validatedAtIso = new Date().toISOString();
    await this.transition(validated.planId, 'PENDING_VALIDATION', 'VALID', null, async (client) => {
      await this.upsertExecutabilityRecord(client, {
        planId: validated.planId,
        adapterId: LEGACY_EXECUTABILITY_ADAPTER_ID,
        state: 'VALID',
        validatedAtIso,
      });
    });
  }

  public async markInvalid(
    planRef: PlanRefSchemaT,
    report: ExecutabilityValidationResult & { status: 'ERROR' }
  ): Promise<void> {
    const validated = parsePlanRef(planRef);
    const validatedAtIso = new Date().toISOString();
    await this.transition(
      validated.planId,
      'PENDING_VALIDATION',
      'INVALID',
      report,
      async (client) => {
        await this.upsertExecutabilityRecord(client, {
          planId: validated.planId,
          adapterId: LEGACY_EXECUTABILITY_ADAPTER_ID,
          state: 'INVALID',
          validatedAtIso,
          rejectionReport: {
            code: report.code,
            reason: report.reason,
            degradable: report.degradable,
            ...(report.cause === undefined ? {} : { cause: report.cause }),
          },
        });
      }
    );
  }

  public async createPlanRecord(record: PlanRecord): Promise<void> {
    const validated = parsePlanRecord(record);
    await this.withTransaction(async (client) => {
      const inserted = await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.plan_records (
            plan_id,
            canonical_plan_json,
            canonical_hash,
            plan_version,
            schema_version,
            contract_version,
            source_ref,
            state,
            created_at,
            updated_at,
            derived_from_plan_id,
            supersedes_plan_id,
            archived_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11, $12, $13::timestamptz
          )
          ON CONFLICT (plan_id) DO NOTHING
          RETURNING plan_id
        `,
        [
          validated.planId,
          validated.canonicalPlanJson,
          validated.canonicalHash,
          validated.planVersion,
          validated.schemaVersion,
          validated.contractVersion,
          validated.sourceRef,
          validated.state,
          validated.createdAtIso,
          validated.updatedAtIso,
          validated.derivedFromPlanId ?? null,
          validated.supersedesPlanId ?? null,
          validated.state === 'ARCHIVED' ? validated.archivedAtIso : null,
        ]
      );
      if (inserted.rowCount === 0) {
        throw new Error(`PLAN_RECORD_ALREADY_EXISTS: ${validated.planId}`);
      }
    });
  }

  public async recordExecutability(record: PlanExecutabilityRecord): Promise<void> {
    const validated = parsePlanExecutabilityRecord(record);
    await this.withTransaction(async (client) => {
      await this.upsertExecutabilityRecord(client, validated);
    });
  }

  public async markAdmitted(link: PlanAdmissionLink): Promise<void> {
    const validated = parsePlanAdmissionLink(link);
    await this.withTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.plan_admission_links (
            plan_id,
            run_id,
            adapter_id,
            admitted_at
          ) VALUES ($1, $2, $3, $4::timestamptz)
          ON CONFLICT (plan_id, run_id, adapter_id) DO NOTHING
        `,
        [validated.planId, validated.runId, validated.adapterId, validated.admittedAtIso]
      );
    });
  }

  public async markSuperseded(
    planId: PlanRecord['planId'],
    supersededByPlanId: PlanRecord['planId']
  ): Promise<void> {
    if (planId === supersededByPlanId) {
      throw new Error(`PLAN_RECORD_INVALID_SUPERSESSION_SELF: ${planId}`);
    }
    await this.withTransaction(async (client) => {
      const result = await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.plan_records
          SET state = 'SUPERSEDED',
              updated_at = NOW()
          WHERE plan_id = $1 AND state = 'ACTIVE'
        `,
        [planId]
      );
      if (result.rowCount === 0) {
        throw new Error(`PLAN_RECORD_NOT_ACTIVE: ${planId}`);
      }

      const superseder = await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.plan_records
          SET supersedes_plan_id = COALESCE(supersedes_plan_id, $2),
              updated_at = NOW()
          WHERE plan_id = $1 AND state = 'ACTIVE'
        `,
        [supersededByPlanId, planId]
      );
      if (superseder.rowCount === 0) {
        throw new Error(`PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND: ${supersededByPlanId}`);
      }
    });
  }

  public async archivePlan(planId: PlanRecord['planId'], archivedAtIso: string): Promise<void> {
    await this.withTransaction(async (client) => {
      const result = await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.plan_records
          SET state = 'ARCHIVED',
              archived_at = $2::timestamptz,
              updated_at = NOW()
          WHERE plan_id = $1
        `,
        [planId, archivedAtIso]
      );
      if (result.rowCount === 0) {
        throw new Error(`PLAN_RECORD_NOT_FOUND: ${planId}`);
      }
    });
  }

  public async getPlanRecord(planId: PlanRecord['planId']): Promise<PlanRecord | undefined> {
    return this.withClient(async (client) => {
      const row = await client.query<{
        plan_id: string;
        canonical_plan_json: string;
        canonical_hash: string;
        plan_version: string;
        schema_version: string;
        contract_version: string;
        source_ref: string;
        state: 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
        created_at_iso: string;
        updated_at_iso: string;
        derived_from_plan_id: string | null;
        supersedes_plan_id: string | null;
        archived_at_iso: string | null;
      }>(
        `
          SELECT
            plan_id,
            canonical_plan_json,
            canonical_hash,
            plan_version,
            schema_version,
            contract_version,
            source_ref,
            state,
            created_at::text AS created_at_iso,
            updated_at::text AS updated_at_iso,
            derived_from_plan_id,
            supersedes_plan_id,
            archived_at::text AS archived_at_iso
          FROM ${quoteIdentifier(this.schema)}.plan_records
          WHERE plan_id = $1
        `,
        [planId]
      );
      const first = row.rows[0];
      return first ? parsePlanRecord(toPlanRecord(first)) : undefined;
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
      const result = await client.query<{
        plan_id: string;
        adapter_id: string;
        state: ExecutabilityState;
        validated_at_iso: string | null;
        rejection_report_json: unknown;
      }>(
        `
          SELECT
            plan_id,
            adapter_id,
            state,
            validated_at::text AS validated_at_iso,
            rejection_report_json
          FROM ${quoteIdentifier(this.schema)}.plan_executability_records
          WHERE plan_id = $1
        `,
        [planId]
      );
      return result.rows.map((row) => parsePlanExecutabilityRecord(toPlanExecutabilityRecord(row)));
    });
  }

  public async getAdmissionLinks(
    planId: PlanRecord['planId']
  ): Promise<ReadonlyArray<PlanAdmissionLink>> {
    return this.withClient(async (client) => {
      const result = await client.query<{
        plan_id: string;
        run_id: string;
        adapter_id: string;
        admitted_at_iso: string;
      }>(
        `
          SELECT
            plan_id,
            run_id,
            adapter_id,
            admitted_at::text AS admitted_at_iso
          FROM ${quoteIdentifier(this.schema)}.plan_admission_links
          WHERE plan_id = $1
          ORDER BY admitted_at ASC
        `,
        [planId]
      );
      return result.rows.map((row) =>
        parsePlanAdmissionLink({
          planId: row.plan_id,
          runId: row.run_id,
          adapterId: row.adapter_id,
          admittedAtIso: row.admitted_at_iso,
        })
      );
    });
  }

  public async getSupersession(
    planId: PlanRecord['planId']
  ): Promise<{ supersededByPlanId: PlanRecord['planId'] } | undefined> {
    return this.withClient(async (client) => {
      const result = await client.query<{ superseded_by_plan_id: string | null }>(
        `
          SELECT p2.plan_id AS superseded_by_plan_id
          FROM ${quoteIdentifier(this.schema)}.plan_records p1
          LEFT JOIN ${quoteIdentifier(this.schema)}.plan_records p2
            ON p2.supersedes_plan_id = p1.plan_id
          WHERE p1.plan_id = $1
          ORDER BY p2.updated_at DESC
          LIMIT 1
        `,
        [planId]
      );
      const supersededByPlanId = result.rows[0]?.superseded_by_plan_id;
      return supersededByPlanId ? { supersededByPlanId } : undefined;
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

  private async upsertPlanRecord(client: PoolClient, record: PlanRecord): Promise<void> {
    const upsertResult = await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_records (
          plan_id,
          canonical_plan_json,
          canonical_hash,
          plan_version,
          schema_version,
          contract_version,
          source_ref,
          state,
          created_at,
          updated_at,
          derived_from_plan_id,
          supersedes_plan_id,
          archived_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11, $12, $13::timestamptz
        )
        ON CONFLICT (plan_id) DO UPDATE
        SET state = EXCLUDED.state,
            updated_at = EXCLUDED.updated_at,
            supersedes_plan_id = COALESCE(plan_records.supersedes_plan_id, EXCLUDED.supersedes_plan_id),
            archived_at = COALESCE(EXCLUDED.archived_at, plan_records.archived_at)
        WHERE
          plan_records.canonical_plan_json = EXCLUDED.canonical_plan_json
          AND plan_records.canonical_hash = EXCLUDED.canonical_hash
          AND plan_records.plan_version = EXCLUDED.plan_version
          AND plan_records.schema_version = EXCLUDED.schema_version
          AND plan_records.contract_version = EXCLUDED.contract_version
          AND plan_records.source_ref = EXCLUDED.source_ref
          AND plan_records.created_at = EXCLUDED.created_at
        RETURNING plan_id
      `,
      [
        record.planId,
        record.canonicalPlanJson,
        record.canonicalHash,
        record.planVersion,
        record.schemaVersion,
        record.contractVersion,
        record.sourceRef,
        record.state,
        record.createdAtIso,
        record.updatedAtIso,
        record.derivedFromPlanId ?? null,
        record.supersedesPlanId ?? null,
        record.state === 'ARCHIVED' ? record.archivedAtIso : null,
      ]
    );
    if (upsertResult.rowCount === 0) {
      throw new Error(`PLAN_RECORD_CONFLICT: ${record.planId}`);
    }
  }

  private async upsertExecutabilityRecord(
    client: PoolClient,
    record: PlanExecutabilityRecord
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_executability_records (
          plan_id,
          adapter_id,
          state,
          validated_at,
          rejection_report_json
        ) VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
        ON CONFLICT (plan_id, adapter_id) DO UPDATE
        SET state = EXCLUDED.state,
            validated_at = EXCLUDED.validated_at,
            rejection_report_json = EXCLUDED.rejection_report_json
      `,
      [
        record.planId,
        record.adapterId,
        record.state,
        record.state === 'PENDING' ? null : record.validatedAtIso,
        record.state === 'INVALID' ? JSON.stringify(record.rejectionReport) : null,
      ]
    );
  }

  private async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (this.statementTimeoutMs > 0) {
        await client.query('SET LOCAL statement_timeout = $1', [this.statementTimeoutMs]);
      }
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback failure
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      if (this.statementTimeoutMs > 0) {
        await client.query('SET statement_timeout = $1', [this.statementTimeoutMs]);
      }
      return await fn(client);
    } finally {
      client.release();
    }
  }
}

function buildPlanRecord(buildResult: PlannerBuildResultV2, planRef: PlanRefSchemaT): PlanRecord {
  const nowIso = new Date().toISOString();
  return parsePlanRecord({
    planId: buildResult.plan.metadata.planId,
    canonicalPlanJson: buildResult.canonicalPlanJson,
    canonicalHash: createHash('sha256').update(buildResult.canonicalPlanJson).digest('hex'),
    planVersion: buildResult.plan.metadata.planVersion,
    schemaVersion: buildResult.plan.metadata.schemaVersion,
    contractVersion: buildResult.plan.metadata.contractVersion,
    sourceRef: planRef.uri,
    state: 'ACTIVE',
    createdAtIso: buildResult.plan.metadata.createdAtIso,
    updatedAtIso: nowIso,
  });
}

function toPlanRecord(row: {
  plan_id: string;
  canonical_plan_json: string;
  canonical_hash: string;
  plan_version: string;
  schema_version: string;
  contract_version: string;
  source_ref: string;
  state: 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
  created_at_iso: string;
  updated_at_iso: string;
  derived_from_plan_id: string | null;
  supersedes_plan_id: string | null;
  archived_at_iso: string | null;
}): PlanRecord {
  return parsePlanRecord({
    planId: row.plan_id,
    canonicalPlanJson: row.canonical_plan_json,
    canonicalHash: row.canonical_hash,
    planVersion: row.plan_version,
    schemaVersion: row.schema_version,
    contractVersion: row.contract_version,
    sourceRef: row.source_ref,
    state: row.state,
    createdAtIso: row.created_at_iso,
    updatedAtIso: row.updated_at_iso,
    ...(row.derived_from_plan_id === null ? {} : { derivedFromPlanId: row.derived_from_plan_id }),
    ...(row.supersedes_plan_id === null ? {} : { supersedesPlanId: row.supersedes_plan_id }),
    ...(row.state === 'ARCHIVED'
      ? { archivedAtIso: row.archived_at_iso ?? row.updated_at_iso }
      : {}),
  });
}

function toPlanExecutabilityRecord(row: {
  plan_id: string;
  adapter_id: string;
  state: ExecutabilityState;
  validated_at_iso: string | null;
  rejection_report_json: unknown;
}): PlanExecutabilityRecord {
  if (row.state === 'PENDING') {
    return { planId: row.plan_id, adapterId: row.adapter_id, state: 'PENDING' };
  }
  if (row.state === 'VALID') {
    if (row.validated_at_iso === null) {
      throw new Error(`PLAN_EXECUTABILITY_ROW_INVALID: ${row.plan_id}:${row.adapter_id}:VALID`);
    }
    return {
      planId: row.plan_id,
      adapterId: row.adapter_id,
      state: 'VALID',
      validatedAtIso: row.validated_at_iso,
    };
  }
  if (row.validated_at_iso === null || row.rejection_report_json === null) {
    throw new Error(`PLAN_EXECUTABILITY_ROW_INVALID: ${row.plan_id}:${row.adapter_id}:INVALID`);
  }
  return {
    planId: row.plan_id,
    adapterId: row.adapter_id,
    state: 'INVALID',
    validatedAtIso: row.validated_at_iso,
    rejectionReport: row.rejection_report_json as PlanExecutabilityRejectionReport,
  };
}

function buildPlanRef(input: {
  planId: string;
  planVersion: string;
  schemaVersion: string;
  executableBytes: Uint8Array;
  requiresCapabilities?: readonly string[];
}): PlanRefSchemaT {
  const sha256 = createHash('sha256').update(input.executableBytes).digest('hex');
  return {
    uri: `${PLAN_URI_SCHEME}://postgres/${input.planId}`,
    sha256,
    schemaVersion: input.schemaVersion,
    planId: input.planId,
    planVersion: input.planVersion,
    sizeBytes: input.executableBytes.byteLength,
    ...(input.requiresCapabilities && input.requiresCapabilities.length > 0
      ? { requiresCapabilities: [...input.requiresCapabilities] }
      : {}),
  };
}

function buildPlanRefFromStoredRow(row: StoredPlanRow): PlanRefSchemaT {
  const requiresCapabilities = normalizeRequiresCapabilities(row.requires_capabilities);
  return {
    uri: row.plan_uri,
    sha256: row.plan_sha256,
    schemaVersion: row.schema_version,
    planId: row.plan_id,
    planVersion: row.plan_version,
    sizeBytes: row.size_bytes,
    ...(requiresCapabilities.length > 0 ? { requiresCapabilities } : {}),
  };
}

function assertStoredPlanMatchesRequest(
  row: StoredPlanRow,
  expected: {
    planRef: PlanRefSchemaT;
    canonicalPlanJson: string;
    executablePlanJson: string;
  }
): void {
  const mismatches: string[] = [];

  if (row.plan_version !== expected.planRef.planVersion) mismatches.push('plan_version');
  if (row.plan_uri !== expected.planRef.uri) mismatches.push('plan_uri');
  if (row.plan_sha256 !== expected.planRef.sha256) mismatches.push('plan_sha256');
  if (row.schema_version !== expected.planRef.schemaVersion) mismatches.push('schema_version');
  if (row.size_bytes !== expected.planRef.sizeBytes) mismatches.push('size_bytes');

  const actualCapabilities = normalizeRequiresCapabilities(row.requires_capabilities);
  const expectedCapabilities = [...(expected.planRef.requiresCapabilities ?? [])].sort(
    (left, right) => left.localeCompare(right)
  );
  if (JSON.stringify(actualCapabilities) !== JSON.stringify(expectedCapabilities)) {
    mismatches.push('requires_capabilities');
  }

  if (row.canonical_plan_json !== expected.canonicalPlanJson)
    mismatches.push('canonical_plan_json');
  if (row.executable_plan_json !== expected.executablePlanJson)
    mismatches.push('executable_plan_json');

  if (mismatches.length > 0) {
    throw new Error(`PLAN_STORE_CONFLICT: ${expected.planRef.planId}:${mismatches.join(',')}`);
  }
}

function normalizeRequiresCapabilities(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('PLAN_STORE_ROW_INVALID: requires_capabilities');
  }

  return [...value].sort((left, right) => left.localeCompare(right));
}
