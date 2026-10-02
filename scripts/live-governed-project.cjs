'use strict';

/** Owns tenant-level bootstrap and the existing CreateProject command for live proofs. */
function buildInitialTenantAccess(tenantId, tenantActions) {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new Error('A tenant id is required for governed project creation');
  }
  return [{ tenantId: tenantId.trim(), allowedActions: [...tenantActions], projectAccess: [] }];
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

module.exports = { buildInitialTenantAccess, createGovernedProject };
