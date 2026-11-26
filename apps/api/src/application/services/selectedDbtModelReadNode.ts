/** Validate the published file Model before it enters the existing producer resolver. */
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  WorkspaceDbtModelReferenceSchema,
  type ConnectionRef,
  type DbtProjectGraphProjection,
  type WorkspaceDbtModelReference,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';

export function createFileModelReadNode(
  projection: DbtProjectGraphProjection,
  uniqueId: string
): WorkspaceGraphAuthoringNode {
  if (projection.freshness !== 'fresh')
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  if (!projection.capabilities.canPreview)
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  const connection = readPostgresProjectionConnection(projection);
  const model = readPublishedModel(projection, uniqueId);
  const fields = model.columns.map(projectPublishedField);
  if (fields.length === 0) throw new CanvasModelSqlUnavailableError('input_unavailable');
  const reference = WorkspaceDbtModelReferenceSchema.parse({
    schemaVersion: 'workspace-dbt-model-reference.v1',
    canvasId: projection.authorityBinding.canvasId,
    uniqueId,
    connectionRef: connection,
    relationId: allocateDvtRelationId(),
    fields,
  });
  return {
    id: `dbt-model-reference:${reference.canvasId}:${uniqueId}`,
    name: model.name,
    kind: 'dvt:transform',
    pluginId: 'dvt',
    role: 'transform',
    status: 'idle',
    tags: [...model.tags],
    metadata: { dbtModelReference: reference },
  };
}

function readPostgresProjectionConnection(projection: DbtProjectGraphProjection): ConnectionRef {
  const target = projection.executionTarget;
  if (target == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
  if (target.connectionRef.provider !== 'postgres')
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return target.connectionRef;
}

function readPublishedModel(
  projection: DbtProjectGraphProjection,
  uniqueId: string
): DbtProjectGraphProjection['nodes'][number] {
  const model = projection.nodes.find(
    (item) => item.uniqueId === uniqueId && item.resourceType === 'model'
  );
  if (model == null) throw new CanvasModelSqlUnavailableError('model_unavailable');
  return model;
}

function projectPublishedField(
  column: DbtProjectGraphProjection['nodes'][number]['columns'][number]
): WorkspaceDbtModelReference['fields'][number] {
  if (column.dataType == null) throw new CanvasModelSqlUnavailableError('input_unavailable');
  return {
    fieldId: allocateDvtFieldId(),
    name: column.name,
    dataType: column.dataType,
    nullable: true,
  };
}
