import type { PlanExecutabilityRecord } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { type ExecutabilityState, toPlanExecutabilityRecord } from './PostgresPlanStore.mappers.js';
import { quoteIdentifier } from './sqlUtils.js';

export class PostgresPlanExecutabilityRepository {
  public constructor(private readonly schema: string) {}

  public async upsert(client: PoolClient, record: PlanExecutabilityRecord): Promise<void> {
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

  public async listByPlanId(
    client: PoolClient,
    planId: string
  ): Promise<ReadonlyArray<PlanExecutabilityRecord>> {
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
    return result.rows.map((row) => toPlanExecutabilityRecord(row));
  }
}
