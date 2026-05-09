/**
 * Owned concern: persist tenant-owned plan-record aggregate state.
 */
import type { PlanRecord, ScopedPlanId } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { toPlanRecord } from './PostgresPlanStore.mappers.js';
import { quoteIdentifier } from './sqlUtils.js';

type PlanRecordRow = {
  tenant_id: string;
  project_id: string;
  environment_id: string;
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
};

type PlanRecordScope = Pick<PlanRecord, 'tenantId' | 'projectId' | 'environmentId'>;
type MarkSupersededInput = ScopedPlanId & { readonly supersededByPlanId: PlanRecord['planId'] };

export class PostgresPlanRecordRepository {
  public constructor(private readonly schema: string) {}

  public async create(client: PoolClient, record: PlanRecord): Promise<void> {
    if (record.derivedFromPlanId !== undefined) {
      await this.assertExists(client, record, record.derivedFromPlanId, 'derived_from_plan_id');
    }
    if (record.supersedesPlanId !== undefined) {
      await this.assertExists(client, record, record.supersedesPlanId, 'supersedes_plan_id');
    }

    const inserted = await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_records (
          tenant_id,
          project_id,
          environment_id,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz, $14, $15, $16::timestamptz
        )
        ON CONFLICT (tenant_id, project_id, environment_id, plan_id) DO NOTHING
        RETURNING plan_id
      `,
      [
        record.tenantId,
        record.projectId,
        record.environmentId,
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

    if (inserted.rowCount === 0) {
      throw new Error(`PLAN_RECORD_ALREADY_EXISTS: ${record.planId}`);
    }
  }

  public async upsert(client: PoolClient, record: PlanRecord): Promise<void> {
    const upsertResult = await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_records (
          tenant_id,
          project_id,
          environment_id,
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13::timestamptz, $14, $15, $16::timestamptz
        )
        ON CONFLICT (tenant_id, project_id, environment_id, plan_id) DO UPDATE
        SET updated_at = EXCLUDED.updated_at,
            supersedes_plan_id = COALESCE(plan_records.supersedes_plan_id, EXCLUDED.supersedes_plan_id),
            archived_at = plan_records.archived_at
        WHERE
          plan_records.canonical_plan_json = EXCLUDED.canonical_plan_json
          AND plan_records.canonical_hash = EXCLUDED.canonical_hash
          AND plan_records.plan_version = EXCLUDED.plan_version
          AND plan_records.schema_version = EXCLUDED.schema_version
          AND plan_records.contract_version = EXCLUDED.contract_version
          AND plan_records.source_ref = EXCLUDED.source_ref
          AND plan_records.created_at = EXCLUDED.created_at
          AND plan_records.state = 'ACTIVE'
        RETURNING plan_id
      `,
      [
        record.tenantId,
        record.projectId,
        record.environmentId,
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

  public async get(client: PoolClient, input: ScopedPlanId): Promise<PlanRecord | undefined> {
    const row = await client.query<PlanRecordRow>(
      `
        SELECT
          tenant_id,
          project_id,
          environment_id,
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
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
      `,
      [input.tenantId, input.projectId, input.environmentId, input.planId]
    );
    const first = row.rows[0];
    return first ? toPlanRecord(first) : undefined;
  }

  public async markSuperseded(client: PoolClient, input: MarkSupersededInput): Promise<void> {
    if (input.planId === input.supersededByPlanId) {
      throw new Error(`PLAN_RECORD_INVALID_SUPERSESSION_SELF: ${input.planId}`);
    }

    await this.assertSupersederCanLink(client, input);
    await this.markPlanAsSuperseded(client, input);
    await this.linkSuperseder(client, input);
  }

  private async assertSupersederCanLink(
    client: PoolClient,
    input: MarkSupersededInput
  ): Promise<void> {
    const supersederState = await client.query<{
      state: PlanRecord['state'];
      supersedes_plan_id: string | null;
    }>(
      `
        SELECT state, supersedes_plan_id
        FROM ${quoteIdentifier(this.schema)}.plan_records
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
        FOR UPDATE
      `,
      [input.tenantId, input.projectId, input.environmentId, input.supersededByPlanId]
    );
    const supersederRow = supersederState.rows[0];
    if (!supersederRow || supersederRow.state !== 'ACTIVE') {
      throw new Error(
        `PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND: ${input.supersededByPlanId}`
      );
    }
    if (supersederRow.supersedes_plan_id !== null) {
      throw new Error(`PLAN_RECORD_SUPERSEDER_ALREADY_LINKED: ${input.supersededByPlanId}`);
    }
  }

  private async markPlanAsSuperseded(
    client: PoolClient,
    input: MarkSupersededInput
  ): Promise<void> {
    const result = await client.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.plan_records
        SET state = 'SUPERSEDED',
            updated_at = NOW()
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
          AND state = 'ACTIVE'
      `,
      [input.tenantId, input.projectId, input.environmentId, input.planId]
    );
    if (result.rowCount === 0) {
      throw new Error(`PLAN_RECORD_NOT_ACTIVE: ${input.planId}`);
    }
  }

  private async linkSuperseder(client: PoolClient, input: MarkSupersededInput): Promise<void> {
    const superseder = await client.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.plan_records
        SET supersedes_plan_id = $5,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
          AND state = 'ACTIVE'
          AND supersedes_plan_id IS NULL
      `,
      [input.tenantId, input.projectId, input.environmentId, input.supersededByPlanId, input.planId]
    );
    if (superseder.rowCount === 0) {
      throw new Error(`PLAN_RECORD_SUPERSEDER_WRITE_FAILED: ${input.supersededByPlanId}`);
    }
  }

  public async archivePlan(
    client: PoolClient,
    input: ScopedPlanId & { readonly archivedAtIso: string }
  ): Promise<void> {
    const result = await client.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.plan_records
        SET state = 'ARCHIVED',
            archived_at = $5::timestamptz,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
      `,
      [input.tenantId, input.projectId, input.environmentId, input.planId, input.archivedAtIso]
    );
    if (result.rowCount === 0) {
      throw new Error(`PLAN_RECORD_NOT_FOUND: ${input.planId}`);
    }
  }

  public async getSupersession(
    client: PoolClient,
    input: ScopedPlanId
  ): Promise<{ supersededByPlanId: PlanRecord['planId'] } | undefined> {
    const result = await client.query<{ superseded_by_plan_id: string | null }>(
      `
        SELECT p2.plan_id AS superseded_by_plan_id
        FROM ${quoteIdentifier(this.schema)}.plan_records p1
        LEFT JOIN ${quoteIdentifier(this.schema)}.plan_records p2
          ON p2.tenant_id = p1.tenant_id
          AND p2.project_id = p1.project_id
          AND p2.environment_id = p1.environment_id
          AND p2.supersedes_plan_id = p1.plan_id
        WHERE p1.tenant_id = $1
          AND p1.project_id = $2
          AND p1.environment_id = $3
          AND p1.plan_id = $4
        ORDER BY p2.updated_at DESC
        LIMIT 1
      `,
      [input.tenantId, input.projectId, input.environmentId, input.planId]
    );
    const supersededByPlanId = result.rows[0]?.superseded_by_plan_id;
    return supersededByPlanId ? { supersededByPlanId } : undefined;
  }

  private async assertExists(
    client: PoolClient,
    scope: PlanRecordScope,
    planId: string,
    field: 'derived_from_plan_id' | 'supersedes_plan_id'
  ): Promise<void> {
    const result = await client.query<{ plan_id: string }>(
      `
        SELECT plan_id
        FROM ${quoteIdentifier(this.schema)}.plan_records
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
      `,
      [scope.tenantId, scope.projectId, scope.environmentId, planId]
    );
    if (result.rowCount === 0) {
      throw new Error(`PLAN_RECORD_REFERENCE_NOT_FOUND: ${field}:${planId}`);
    }
  }
}
