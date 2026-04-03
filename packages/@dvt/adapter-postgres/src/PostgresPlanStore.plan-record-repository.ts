import type { PlanRecord } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { toPlanRecord } from './PostgresPlanStore.mappers.js';
import { quoteIdentifier } from './sqlUtils.js';

type PlanRecordRow = {
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

export class PostgresPlanRecordRepository {
  public constructor(private readonly schema: string) {}

  public async create(client: PoolClient, record: PlanRecord): Promise<void> {
    if (record.derivedFromPlanId !== undefined) {
      await this.assertExists(client, record.derivedFromPlanId, 'derived_from_plan_id');
    }
    if (record.supersedesPlanId !== undefined) {
      await this.assertExists(client, record.supersedesPlanId, 'supersedes_plan_id');
    }

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

  public async get(client: PoolClient, planId: string): Promise<PlanRecord | undefined> {
    const row = await client.query<PlanRecordRow>(
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
    return first ? toPlanRecord(first) : undefined;
  }

  public async markSuperseded(
    client: PoolClient,
    planId: PlanRecord['planId'],
    supersededByPlanId: PlanRecord['planId']
  ): Promise<void> {
    if (planId === supersededByPlanId) {
      throw new Error(`PLAN_RECORD_INVALID_SUPERSESSION_SELF: ${planId}`);
    }

    const supersederState = await client.query<{
      state: PlanRecord['state'];
      supersedes_plan_id: string | null;
    }>(
      `
        SELECT state, supersedes_plan_id
        FROM ${quoteIdentifier(this.schema)}.plan_records
        WHERE plan_id = $1
        FOR UPDATE
      `,
      [supersededByPlanId]
    );
    const supersederRow = supersederState.rows[0];
    if (!supersederRow || supersederRow.state !== 'ACTIVE') {
      throw new Error(`PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND: ${supersededByPlanId}`);
    }
    if (supersederRow.supersedes_plan_id !== null) {
      throw new Error(`PLAN_RECORD_SUPERSEDER_ALREADY_LINKED: ${supersededByPlanId}`);
    }

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
        SET supersedes_plan_id = $2,
            updated_at = NOW()
        WHERE plan_id = $1 AND state = 'ACTIVE' AND supersedes_plan_id IS NULL
      `,
      [supersededByPlanId, planId]
    );
    if (superseder.rowCount === 0) {
      throw new Error(`PLAN_RECORD_SUPERSEDER_WRITE_FAILED: ${supersededByPlanId}`);
    }
  }

  public async archivePlan(
    client: PoolClient,
    planId: PlanRecord['planId'],
    archivedAtIso: string
  ): Promise<void> {
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
  }

  public async getSupersession(
    client: PoolClient,
    planId: PlanRecord['planId']
  ): Promise<{ supersededByPlanId: PlanRecord['planId'] } | undefined> {
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
  }

  private async assertExists(
    client: PoolClient,
    planId: string,
    field: 'derived_from_plan_id' | 'supersedes_plan_id'
  ): Promise<void> {
    const result = await client.query<{ plan_id: string }>(
      `
        SELECT plan_id
        FROM ${quoteIdentifier(this.schema)}.plan_records
        WHERE plan_id = $1
      `,
      [planId]
    );
    if (result.rowCount === 0) {
      throw new Error(`PLAN_RECORD_REFERENCE_NOT_FOUND: ${field}:${planId}`);
    }
  }
}
