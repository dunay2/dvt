/** Owned concern: verify that a DBT target resolves to its governed workspace connection. */
import type { IDbtExecutionConnectionBindingVerifier } from '../ports/dbtExecutionTarget.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';
import { WarehouseConnectionNotFoundError } from '../ports/warehouseSourceImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

export async function resolveDbtExecutionConnectionBinding(input: {
  readonly catalog: IWarehouseConnectionCatalog;
  readonly verifier: IDbtExecutionConnectionBindingVerifier;
  readonly scope: WorkspaceStorageScope;
  readonly connectionRef: Readonly<{ connectionId: string; provider: string }>;
  readonly targetProfile: string;
  readonly runtimeCredentialRef: string;
}): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  let connection: Awaited<ReturnType<IWarehouseConnectionCatalog['getConnection']>>;
  try {
    connection = await input.catalog.getConnection(input.scope, input.connectionRef.connectionId);
  } catch (error) {
    if (error instanceof WarehouseConnectionNotFoundError) {
      return {
        ok: false,
        reason: 'The Preview-bound DBT connection is not in this workspace.',
      };
    }
    throw error;
  }

  if (
    connection.id !== input.connectionRef.connectionId ||
    connection.type !== input.connectionRef.provider
  ) {
    return { ok: false, reason: 'The Preview-bound DBT connection identity is invalid.' };
  }
  if (
    connection.credentialRef === undefined ||
    !(await input.verifier.verify({
      runtimeCredentialRef: input.runtimeCredentialRef,
      targetProfile: input.targetProfile,
      connectionCredentialRef: connection.credentialRef,
    }))
  ) {
    return {
      ok: false,
      reason:
        'The Preview-bound DBT profile does not resolve to its governed workspace connection.',
    };
  }
  return { ok: true };
}
