'use strict';

/** Owns tenant-level bootstrap and the existing CreateProject command for live proofs. */
const { Client, escapeIdentifier } = require('pg');

function buildInitialTenantAccess(tenantId, tenantActions) {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new Error('A tenant id is required for governed project creation');
  }
  return [{ tenantId: tenantId.trim(), allowedActions: [...tenantActions], projectAccess: [] }];
}

async function seedInitialTenantGrant(
  args,
  deps = { createClient: (options) => new Client(options) }
) {
  const tenantAccess = JSON.stringify(buildInitialTenantAccess(args.tenantId, args.tenantActions));
  const schema = escapeIdentifier(args.schema);
  const client = deps.createClient({ connectionString: args.databaseUrl });
  try {
    await client.connect();
    await client.query(
      `INSERT INTO ${schema}.principal_grants
         (principal_id, principal_type, suspended, tenant_access)
       VALUES ($1, 'user', FALSE, $2::jsonb)
       ON CONFLICT (principal_id, principal_type)
       DO UPDATE SET tenant_access = EXCLUDED.tenant_access,
                     suspended = FALSE,
                     updated_at = NOW()`,
      [args.principalId, tenantAccess]
    );
  } finally {
    await client.end();
  }
}

async function createGovernedProject(args, fetchImpl = fetch) {
  const response = await fetchImpl(`${args.apiBaseUrl}/projects`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${args.bearerToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': args.idempotencyKey,
    },
    body: JSON.stringify({ tenantId: args.tenantId, name: args.name }),
  });
  const body = await response.json();
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(
      `Governed project creation failed with ${response.status}: ${JSON.stringify(body)}`
    );
  }

  const workspace = body?.defaultWorkspace;
  if (
    workspace === null ||
    typeof workspace !== 'object' ||
    typeof workspace.tenantId !== 'string' ||
    typeof workspace.projectId !== 'string' ||
    typeof workspace.projectName !== 'string' ||
    typeof workspace.environmentId !== 'string'
  ) {
    throw new Error('Governed project creation returned an invalid default workspace');
  }
  return workspace;
}

module.exports = { buildInitialTenantAccess, seedInitialTenantGrant, createGovernedProject };
