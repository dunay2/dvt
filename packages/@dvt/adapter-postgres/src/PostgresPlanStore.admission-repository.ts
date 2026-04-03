import type { PlanAdmissionLink } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';

export class PostgresPlanAdmissionRepository {
  public constructor(private readonly schema: string) {}

  public async markAdmitted(client: PoolClient, link: PlanAdmissionLink): Promise<void> {
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
      [link.planId, link.runId, link.adapterId, link.admittedAtIso]
    );
  }

  public async getByPlanId(
    client: PoolClient,
    planId: string
  ): Promise<ReadonlyArray<PlanAdmissionLink>> {
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
    return result.rows.map((row) => ({
      planId: row.plan_id,
      runId: row.run_id,
      adapterId: row.adapter_id,
      admittedAtIso: row.admitted_at_iso,
    }));
  }
}
