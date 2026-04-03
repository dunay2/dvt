import { createHash } from 'node:crypto';

import type { PoolClient } from 'pg';

import {
  sqlBackfillPlanRecordsFromStoredPlans,
  sqlCreatePlanAdmissionLinksTable,
  sqlCreatePlanExecutabilityRecordsTable,
  sqlCreatePlanRecordsTable,
  sqlCreateStoredPlansTable,
  sqlCreateStoredPlansValidationStateIndex,
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
      await client.query(sqlCreateStoredPlansValidationStateIndex(this.schema));
      await client.query(sqlCreatePlanRecordsTable(this.schema));
      await client.query(sqlCreatePlanExecutabilityRecordsTable(this.schema));
      await client.query(sqlCreatePlanAdmissionLinksTable(this.schema));
      await client.query(sqlBackfillPlanRecordsFromStoredPlans(this.schema));
      await client.query(sqlEnsurePlanRecordLineageConstraints(this.schema));
      await client.query(sqlEnsurePlanRecordSupersedesConstraints(this.schema));
      await this.reconcileBackfilledCanonicalHashes(client);
    });
  }

  private async reconcileBackfilledCanonicalHashes(client: PoolClient): Promise<void> {
    const backfilled = await client.query<{
      plan_id: string;
      canonical_plan_json: string;
      canonical_hash: string;
    }>(
      `
        SELECT plan_id, canonical_plan_json, canonical_hash
        FROM ${quoteIdentifier(this.schema)}.plan_records
      `
    );

    for (const row of backfilled.rows) {
      const canonicalHash = createHash('sha256').update(row.canonical_plan_json).digest('hex');
      if (row.canonical_hash !== canonicalHash) {
        await client.query(
          `
            UPDATE ${quoteIdentifier(this.schema)}.plan_records
            SET canonical_hash = $2
            WHERE plan_id = $1
          `,
          [row.plan_id, canonicalHash]
        );
      }
    }
  }
}
