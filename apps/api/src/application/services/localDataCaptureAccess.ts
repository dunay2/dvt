/**
 * Owned concern: scope one capture's existing authorization lease and current source binding.
 * @baseline #3392/#3394: grants and audit belong to the existing authorization service.
 * @decision Decorate its checkpoints with binding/deadline checks; always close the lease.
 * @consequence No permission cache, persisted grant, SQL or generation writes live here.
 */
import { PostgresCredentialRefSchema, type WorkspaceGraphDraftScope } from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import {
  EnvironmentId,
  ProjectId,
  TenantId,
  type AuthenticatedPrincipal,
} from '../../domain/auth/types.js';
import { buildEnvironmentAccessScope } from '../ports/accessDecision.js';
import type { ILocalDataOperationAccess } from '../ports/localDataPlane.js';
import type {
  IWarehouseConnectionCatalog,
  WarehouseSourceObjectProbeTarget,
} from '../ports/warehouseSourceImport.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import { LocalDataAuthorizationLease } from './localDataAuthorizationLease.js';
import { LocalDataCaptureError, type CaptureCommand } from './localDataCapturePolicy.js';

export type CaptureAccessContext = Readonly<{
  principal: AuthenticatedPrincipal;
  scope: WorkspaceGraphDraftScope;
  requestId: string;
}>;
export type CaptureAccessDependencies = Readonly<{
  authorizer: Pick<AuthorizeCommandScopeService, 'authorizeMany'>;
  catalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
  clock: () => Date;
  timeoutMs: number;
}>;
type BoundCaptureAccess = Readonly<{
  access: ILocalDataOperationAccess;
  target: WarehouseSourceObjectProbeTarget;
  providerContextSha256: string;
  startedAt: number;
}>;

/** Scoped resource callback: completion or rejection closes the same lease exactly once. */
export async function withCaptureSourceAccess<T>(
  deps: CaptureAccessDependencies,
  command: CaptureCommand,
  context: CaptureAccessContext,
  callerSignal: globalThis.AbortSignal | undefined,
  consume: (bound: BoundCaptureAccess) => Promise<T>
): Promise<T> {
  if (callerSignal?.aborted) throw new LocalDataCaptureError('CANCELLED');
  const startedAt = deps.clock().getTime();
  if (!Number.isFinite(startedAt)) throw new LocalDataCaptureError('INVALID_EVIDENCE');
  const { scope, principal, requestId } = context;
  // No bearer/token/secret; capture the principal identity before the first await.
  const principalContext = {
    principalId: principal.principalId,
    principalType: principal.principalType,
    subjectId: principal.subjectId,
    issuer: principal.issuer,
    audience: principal.audience,
  };
  const lease = await LocalDataAuthorizationLease.open(
    {
      principal,
      operation: 'capture',
      requestId,
      scope: buildEnvironmentAccessScope(
        TenantId.unsafe(scope.tenantId),
        ProjectId.unsafe(scope.projectId),
        EnvironmentId.unsafe(scope.environmentId)
      ),
    },
    { authorizer: deps.authorizer, clock: deps.clock }
  );
  try {
    const signal = callerSignal
      ? globalThis.AbortSignal.any([lease.signal, callerSignal])
      : lease.signal;
    const assertActive = () => {
      if (signal.aborted) throw new LocalDataCaptureError('CANCELLED');
      const now = deps.clock().getTime();
      if (!Number.isFinite(now) || now < startedAt)
        throw new LocalDataCaptureError('INVALID_EVIDENCE');
      if (now - startedAt >= deps.timeoutMs) throw new LocalDataCaptureError('CAPTURE_TIMEOUT');
    };
    assertActive();
    const target = await resolveCaptureTarget(deps.catalog, scope, command);
    assertActive();
    const binding = jcsCanonicalize(target);
    const check = async (authorize: () => Promise<void>) => {
      assertActive();
      await authorize();
      assertActive();
      const current = await resolveCaptureTarget(deps.catalog, scope, command);
      assertActive();
      if (jcsCanonicalize(current) !== binding)
        throw new LocalDataCaptureError('SOURCE_BINDING_CHANGED');
    };
    const access: ILocalDataOperationAccess = Object.freeze({
      signal,
      checkpoint: () => check(() => lease.checkpoint()),
      beforePromotion: () => check(() => lease.beforePromotion()),
    });
    // Admission context only: not a credential version, grant or remote snapshot certificate.
    const providerContextSha256 = sha256HexUtf8(
      jcsCanonicalize({
        profile: 'local-capture-admission.v1',
        scope,
        principal: principalContext,
        target,
      })
    );
    return await consume({ access, target, providerContextSha256, startedAt });
  } finally {
    lease.close();
  }
}

async function resolveCaptureTarget(
  catalog: CaptureAccessDependencies['catalog'],
  scope: WorkspaceGraphDraftScope,
  command: CaptureCommand
): Promise<WarehouseSourceObjectProbeTarget> {
  const connection = await catalog.getConnection(
    scope,
    command.sourceRef.connectionRef.connectionId
  );
  const credential = PostgresCredentialRefSchema.safeParse(connection.credentialRef);
  if (
    connection.id !== command.sourceRef.connectionRef.connectionId ||
    connection.type !== command.sourceRef.connectionRef.provider ||
    connection.type !== 'postgres' ||
    typeof connection.database !== 'string' ||
    !connection.database.trim() ||
    !credential.success
  ) {
    throw new LocalDataCaptureError('SOURCE_REJECTED');
  }
  return Object.freeze({
    type: connection.type,
    database: connection.database,
    credentialRef: credential.data,
    objectId: command.sourceRef.sourceObjectId,
    ...(command.expectedPublicationToken === undefined
      ? {}
      : { expectedPublicationToken: command.expectedPublicationToken }),
  });
}
