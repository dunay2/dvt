/**
 * Owned concern: persist scoped plan admission links.
 */
import type { PlanAdmissionLink, ScopedPlanId } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';

export class PostgresPlanAdmissionRepository {
  public constructor(private readonly schema: string) {}

  public async markAdmitted(client: PoolClient, link: PlanAdmissionLink): Promise<void> {
    await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.plan_admission_links (
          tenant_id,
          project_id,
          environment_id,
          plan_id,
          run_id,
          adapter_id,
          admitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
        ON CONFLICT (tenant_id, project_id, environment_id, plan_id, run_id, adapter_id) DO NOTHING
      `,
      [
        link.tenantId,
        link.projectId,
        link.environmentId,
        link.planId,
        link.runId,
        link.adapterId,
        link.admittedAtIso,
      ]
    );
  }

  public async getByPlanId(
    client: PoolClient,
    input: ScopedPlanId
  ): Promise<ReadonlyArray<PlanAdmissionLink>> {
    const result = await client.query<{
      tenant_id: string;
      project_id: string;
      environment_id: string;
      plan_id: string;
      run_id: string;
      adapter_id: string;
      admitted_at_iso: string;
    }>(
      `
        SELECT
          tenant_id,
          project_id,
          environment_id,
          plan_id,
          run_id,
          adapter_id,
          admitted_at::text AS admitted_at_iso
        FROM ${quoteIdentifier(this.schema)}.plan_admission_links
        WHERE tenant_id = $1
          AND project_id = $2
          AND environment_id = $3
          AND plan_id = $4
        ORDER BY admitted_at ASC
      `,
      [input.tenantId, input.projectId, input.environmentId, input.planId]
    );
    return result.rows.map((row) => ({
      tenantId: row.tenant_id,
      projectId: row.project_id,
      environmentId: row.environment_id,
      planId: row.plan_id,
      runId: row.run_id,
      adapterId: row.adapter_id,
      admittedAtIso: row.admitted_at_iso,
    }));
  }
}
