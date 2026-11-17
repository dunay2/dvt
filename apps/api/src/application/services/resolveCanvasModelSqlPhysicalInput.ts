/** Resolve absent legacy physical type facts through the existing bounded, authorized catalog query. */
import { ConnectedSourceRefSchema, type WorkspaceGraphAuthoringNode } from '@dvt/contracts';

import { AUTHORIZATION_ACTION } from '../ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import {
  CanvasModelSqlAccessDeniedError,
  CanvasModelSqlUnavailableError,
} from '../ports/canvasModelSql.js';
import {
  WarehouseSourceDiscoveryFailedError,
  WarehouseConnectionNotFoundError,
} from '../ports/warehouseSourceImport.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import { physicalModelSqlPublication } from './canvasModelSqlPublications.js';
import type { ListWarehouseConnectionSourceObjectsUseCase } from './listWarehouseConnectionSourceObjectsUseCase.js';

export class ResolveCanvasModelSqlPhysicalInput {
  public constructor(
    private readonly deps: Readonly<{
      catalog: Pick<ListWarehouseConnectionSourceObjectsUseCase, 'execute'>;
      authorizer: Pick<AuthorizeCommandScopeService, 'authorize'>;
    }>
  ) {}

  public async execute(node: WorkspaceGraphAuthoringNode, context: AuthorizedExecutionContext) {
    const raw = node.metadata?.['columns'];
    const complete =
      Array.isArray(raw) &&
      raw.every(
        (column: unknown) =>
          column != null &&
          typeof column === 'object' &&
          'nullable' in column &&
          typeof column.nullable === 'boolean' &&
          'type' in column &&
          typeof column.type === 'string'
      );
    if (complete) return physicalModelSqlPublication(node);
    const ref = ConnectedSourceRefSchema.parse(node.metadata?.['connectedSourceRef']);
    const schema = node.metadata?.['schema'];
    const table = node.metadata?.['tableName'];
    if (
      ref.connectionRef.provider !== 'postgres' ||
      !Array.isArray(raw) ||
      typeof schema !== 'string' ||
      typeof table !== 'string'
    )
      throw new CanvasModelSqlUnavailableError('input_unavailable');
    const permission = await this.deps.authorizer.authorize(
      context.principal,
      { ...context.scope, action: AUTHORIZATION_ACTION.workspaceSourceImportView },
      context.requestId
    );
    if (
      !permission.ok ||
      permission.context.scope.tenantId.value !== context.scope.tenantId.value ||
      permission.context.scope.projectId?.value !== context.scope.projectId?.value ||
      permission.context.scope.environmentId?.value !== context.scope.environmentId?.value
    )
      throw new CanvasModelSqlAccessDeniedError();
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId == null || environmentId == null)
      throw new CanvasModelSqlUnavailableError('input_unavailable');
    try {
      const page = await this.deps.catalog.execute(
        { tenantId: context.scope.tenantId.value, projectId, environmentId },
        ref.connectionRef.connectionId,
        { kind: 'name-search', name: table, limit: 100 }
      );
      const source =
        page.kind === 'object-page'
          ? page.objects.find(
              (object) =>
                object.objectId === ref.sourceObjectId &&
                object.locator.kind === 'relation' &&
                object.locator.schema === schema &&
                object.locator.name === table
            )
          : undefined;
      const columns = raw.map((column: unknown) => {
        const name =
          column != null && typeof column === 'object' && 'name' in column
            ? column.name
            : undefined;
        const current = source?.columns?.find((candidate) => candidate.name === name);
        if (current == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
        return current;
      });
      return physicalModelSqlPublication({ ...node, metadata: { ...node.metadata, columns } });
    } catch (error) {
      if (
        error instanceof WarehouseSourceDiscoveryFailedError ||
        error instanceof WarehouseConnectionNotFoundError
      )
        throw new CanvasModelSqlUnavailableError('input_unavailable');
      throw error;
    }
  }
}
