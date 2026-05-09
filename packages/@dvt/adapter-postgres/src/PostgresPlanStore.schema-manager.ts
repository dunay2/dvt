/**
 * Owned concern: migrate scoped plan-store tables and fail-fast legacy shapes.
 */
import { createHash } from 'node:crypto';

import type { PoolClient } from 'pg';

import {
  sqlAssertPlanRecordsScopedShape,
  sqlAssertStoredPlansCanonicalOwnership,
  sqlBackfillStoredPlansCompatibilityFingerprint,
  sqlBackfillPlanRecordsFromStoredPlans,
  sqlCreatePlanAdmissionLinksTable,
  sqlCreatePlanExecutabilityRecordsTable,
  sqlCreatePlanRecordsTable,
  sqlCreateStoredPlansTable,
  sqlCreateStoredPlansValidationStateIndex,
  sqlEnsureStoredPlansCompatibilityFingerprintColumn,
  sqlEnsurePlanRecordLineageConstraints,
  sqlEnsurePlanRecordSupersedesConstraints,
} from './PostgresPlanStore.sql.js';
import { PostgresPlanStoreTxRunner } from './PostgresPlanStore.tx.js';
import { quoteIdentifier } from './sqlUtils.js';

export class PostgresPlanStoreSchemaManager {
  public constructor(
    private readonly schema: string,
    private readonly txRunner: PostgresPlanStoreTxRunner
  ) {}

  public async migrate(): Promise<void> {
    await this.txRunner.withTransaction(async (client) => {
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.schema)}`);
      await client.query(sqlCreateStoredPlansTable(this.schema));
      await client.query(sqlEnsureStoredPlansCompatibilityFingerprintColumn(this.schema));
      await client.query(sqlBackfillStoredPlansCompatibilityFingerprint(this.schema));
      await client.query(sqlCreateStoredPlansValidationStateIndex(this.schema));
      await client.query(sqlAssertPlanRecordsScopedShape(this.schema));
      await client.query(sqlCreatePlanRecordsTable(this.schema));
      await client.query(sqlCreatePlanExecutabilityRecordsTable(this.schema));
      await client.query(sqlCreatePlanAdmissionLinksTable(this.schema));
      await client.query(sqlAssertStoredPlansCanonicalOwnership(this.schema));
      await client.query(sqlBackfillPlanRecordsFromStoredPlans(this.schema));
      await client.query(sqlEnsurePlanRecordLineageConstraints(this.schema));
      await client.query(sqlEnsurePlanRecordSupersedesConstraints(this.schema));
      await this.reconcileBackfilledCanonicalHashes(client);
    });
  }

  private async reconcileBackfilledCanonicalHashes(client: PoolClient): Promise<void> {
    const backfilled = await client.query<{
      tenant_id: string;
      project_id: string;
      environment_id: string;
      plan_id: string;
      canonical_plan_json: string;
      canonical_hash: string;
    }>(
      `
        SELECT tenant_id, project_id, environment_id, plan_id, canonical_plan_json, canonical_hash
        FROM ${quoteIdentifier(this.schema)}.plan_records
      `
    );

    for (const row of backfilled.rows) {
      const canonicalHash = createHash('sha256').update(row.canonical_plan_json).digest('hex');
      if (row.canonical_hash !== canonicalHash) {
        await client.query(
          `
            UPDATE ${quoteIdentifier(this.schema)}.plan_records
            SET canonical_hash = $5
            WHERE tenant_id = $1
              AND project_id = $2
              AND environment_id = $3
              AND plan_id = $4
          `,
          [row.tenant_id, row.project_id, row.environment_id, row.plan_id, canonicalHash]
        );
      }
    }
  }
}
