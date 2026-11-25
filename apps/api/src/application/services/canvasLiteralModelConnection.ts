/** Admit the explicit connection of a source-free Model through the existing scoped warehouse authority. */
import {
  ConnectionRefSchema,
  isDvtSubstraitLiteralRowPlanV1,
  type ConnectionRef,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

import { AUTHORIZATION_ACTION } from '../ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import {
  CanvasModelSqlAccessDeniedError,
  CanvasModelSqlUnavailableError,
} from '../ports/canvasModelSql.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import type { ResolveCanvasModelSqlInputs } from './resolveCanvasModelSqlInputs.js';

export type CanvasLiteralConnectionAuthority = Readonly<{
  connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
  authorizer: Pick<AuthorizeCommandScopeService, 'authorize'>;
}>;

export function readCanvasLiteralModelConnection(
  node: WorkspaceGraphAuthoringNode,
  document: SubstraitDocument | null | undefined
): ConnectionRef | undefined {
  if (document == null || !isDvtSubstraitLiteralRowPlanV1(document.plan, document.sidecar))
    return undefined;
  const parsed = ConnectionRefSchema.safeParse(node.metadata?.['connectionRef']);
  if (!parsed.success || parsed.data.provider !== 'postgres')
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return parsed.data;
}

function literalScope(context: AuthorizedExecutionContext): {
  tenantId: string;
  projectId: string;
  environmentId: string;
} {
  const projectId = context.scope.projectId?.value,
    environmentId = context.scope.environmentId?.value;
  if (projectId == null || environmentId == null)
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  return { tenantId: context.scope.tenantId.value, projectId, environmentId };
}

export async function authorizeCanvasLiteralModelConnection(
  deps: CanvasLiteralConnectionAuthority,
  connectionRef: ConnectionRef,
  context: AuthorizedExecutionContext
): Promise<void> {
  const scope = literalScope(context);
  const permission = await deps.authorizer.authorize(
    context.principal,
    { ...context.scope, action: AUTHORIZATION_ACTION.workspaceSourceImportView },
    context.requestId
  );
  if (
    !permission.ok ||
    jcsCanonicalize(literalScope(permission.context)) !== jcsCanonicalize(scope)
  )
    throw new CanvasModelSqlAccessDeniedError();
  const connection = await deps.connectionCatalog.getConnection(scope, connectionRef.connectionId);
  if (connection.id !== connectionRef.connectionId || connection.type !== 'postgres')
    throw new CanvasModelSqlUnavailableError('input_unavailable');
}

/** Bind the already verified worksheet connection only for a candidate with no input authority. */
export function resolveWorksheetExecutionConnection(
  resolved: Awaited<ReturnType<ResolveCanvasModelSqlInputs['execute']>>,
  target: { modelId: string; connectionRef: ConnectionRef },
  inputCount: number
): typeof resolved {
  if (inputCount === 0)
    return {
      ...resolved,
      connectionRef: target.connectionRef,
      graph: {
        ...resolved.graph,
        literalConnections: new Map([[target.modelId, target.connectionRef]]),
      },
    };
  if (jcsCanonicalize(resolved.connectionRef) !== jcsCanonicalize(target.connectionRef))
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return resolved;
}
