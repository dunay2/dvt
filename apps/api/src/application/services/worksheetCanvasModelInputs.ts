/** Resolve worksheet observations against scoped warehouse and canonical Model authorities. */
import type { ConnectionRef, WorksheetCanvasModelRequest } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';
import type { IDbtModelProducerResolver } from '../ports/dbtModelProducer.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';

import type { ListWarehouseConnectionSourceObjectsUseCase } from './listWarehouseConnectionSourceObjectsUseCase.js';
import type { ResolveCanvasTransformProjection } from './resolveCanvasTransformProjection.js';
import {
  admitWorksheetCatalogRelation,
  type WorksheetCatalogRelation,
} from './worksheetCanvasModelCatalog.js';
import type { WorksheetSqlRelation } from './worksheetCanvasModelSql.js';

export type WorksheetInputDependencies = Readonly<{
  connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
  catalog: Pick<ListWarehouseConnectionSourceObjectsUseCase, 'execute'>;
  projection: Pick<ResolveCanvasTransformProjection, 'execute'>;
  modelProducers: IDbtModelProducerResolver;
}>;
export type WorksheetInputResolution = Readonly<{
  deps: WorksheetInputDependencies;
  input: WorksheetCanvasModelRequest;
  context: AuthorizedExecutionContext;
}>;

export function worksheetScope(context: AuthorizedExecutionContext) {
  const projectId = context.scope.projectId?.value,
    environmentId = context.scope.environmentId?.value;
  if (projectId == null || environmentId == null)
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  return { tenantId: context.scope.tenantId.value, projectId, environmentId };
}

export function assertWorksheetConnection(actual: ConnectionRef, expected: ConnectionRef) {
  if (jcsCanonicalize(actual) !== jcsCanonicalize(expected))
    throw new CanvasModelSqlUnavailableError('input_unavailable');
}

export async function verifyWorksheetConnection(
  deps: WorksheetInputDependencies,
  input: WorksheetCanvasModelRequest,
  context: AuthorizedExecutionContext
) {
  const connection = await deps.connectionCatalog.getConnection(
    worksheetScope(context),
    input.connectionRef.connectionId
  );
  if (connection.type !== 'postgres') throw new CanvasModelSqlUnavailableError('input_unavailable');
  assertWorksheetConnection(
    { schemaVersion: 'connection-ref.v1', connectionId: connection.id, provider: connection.type },
    input.connectionRef
  );
  return connection;
}

export async function resolveWorksheetCatalogRelation({
  deps,
  input,
  relation,
  database,
  context,
}: WorksheetInputResolution &
  Readonly<{
    relation: WorksheetSqlRelation;
    database: string;
  }>): Promise<WorksheetCatalogRelation> {
  assertWorksheetCatalog(relation, database);
  const page = await deps.catalog.execute(
    worksheetScope(context),
    input.connectionRef.connectionId,
    { kind: 'name-search', name: relation.name, limit: 100 }
  );
  return admitWorksheetCatalogRelation(page, relation, database);
}

function assertWorksheetCatalog(relation: WorksheetSqlRelation, database: string) {
  if (relation.catalog == null) return;
  if (relation.catalog !== database) throw new CanvasModelSqlUnavailableError('input_unavailable');
}
