/**
 * Owned concern: persist scoped adapter executability records.
 */
import type { PlanExecutabilityRecord, ScopedPlanId } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { type ExecutabilityState, toPlanExecutabilityRecord } from './PostgresPlanStore.mappers.js';
import { quoteIdentifier } from './sqlUtils.js';

export class PostgresPlanExecutabilityRepository {
  public constructor(private readonly schema: string) {}

  public async upsert(client: PoolClient, record: PlanExecutabilityRecord): Promise<void> {
    await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_executability_records (
          tenant_id,
          project_id,
          environment_id,
          plan_id,
          adapter_id,
          state,
          validated_at,
          rejection_report_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::jsonb)
        ON CONFLICT (tenant_id, project_id, environment_id, plan_id, adapter_id) DO UPDATE
        SET state = EXCLUDED.state,
            validated_at = EXCLUDED.validated_at,
            rejection_report_json = EXCLUDED.rejection_report_json
      `,
      [
        record.tenantId,
        record.projectId,
        record.environmentId,
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
    input: ScopedPlanId & { readonly adapterId?: string }
  ): Promise<ReadonlyArray<PlanExecutabilityRecord>> {
    const result = await client.query<{
      tenant_id: string;
      project_id: string;
      environment_id: string;
      plan_id: string;
      adapter_id: string;
      state: ExecutabilityState;
      validated_at_iso: string | null;
      rejection_report_json: unknown;
    }>(
      `
        SELECT
          tenant_id,
          project_id,
          environment_id,
          plan_id,
          adapter_id,
          state,
          validated_at::text AS validated_at_iso,
          rejection_report_json
        FROM ${quoteIdentifier(this.schema)}.plan_executability_records
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
          AND ($5::text IS NULL OR adapter_id = $5)
      `,
      [input.tenantId, input.projectId, input.environmentId, input.planId, input.adapterId ?? null]
    );
    return result.rows.map((row) => toPlanExecutabilityRecord(row));
  }
}
