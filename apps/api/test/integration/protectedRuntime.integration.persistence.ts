/**
 * @file apps/api/test/integration/protectedRuntime.integration.persistence.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Isolate protected-runtime integration SQL helpers from bootstrap and scenario code
 * @date 2026-04-18
 */
import { Client } from 'pg';

export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function upsertPrincipalGrant(
  client: Client,
  input: {
    schema: string;
    principalId: string;
    principalType: 'user' | 'service';
    tenantId: string;
    projectId: string;
    environmentId: string;
    tenantActions: ReadonlyArray<string>;
  }
): Promise<void> {
  const tenantAccess = JSON.stringify([
    {
      tenantId: input.tenantId,
      allowedActions: [...input.tenantActions],
      projectAccess: [
        {
          projectId: input.projectId,
          allowedActions: [],
          environmentAccess: [
            {
              environmentId: input.environmentId,
              allowedActions: [],
            },
          ],
        },
      ],
    },
  ]);

  await client.query(
    `INSERT INTO ${quoteIdentifier(input.schema)}.principal_grants
       (principal_id, principal_type, suspended, tenant_access)
     VALUES ($1, $2, FALSE, $3::jsonb)
     ON CONFLICT (principal_id, principal_type)
     DO UPDATE SET tenant_access = EXCLUDED.tenant_access,
                   suspended = FALSE,
                   updated_at = NOW()`,
    [input.principalId, input.principalType, tenantAccess]
  );
}

export async function queryLatestStoredPlan(
  client: Client,
  schema: string
): Promise<
  | {
      plan_id: string;
      plan_uri: string;
      validation_state: string;
    }
  | undefined
> {
  const storedPlan = await client.query<{
    plan_id: string;
    plan_uri: string;
    validation_state: string;
  }>(
    `SELECT plan_id, plan_uri, validation_state
       FROM ${quoteIdentifier(schema)}.stored_plans
       ORDER BY stored_at DESC
       LIMIT 1`
  );

  return storedPlan.rows[0];
}
