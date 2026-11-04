/** Adapt accepted file-model publications to native definition references, never copied SQL. */
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  readWorkspaceDbtModelReference,
  WorkspaceDbtModelReferenceSchema,
  type DbtProjectGraphProjection,
} from '@dvt/contracts';
import { createExternalProducerSignature, indexSubstraitRelations } from '@dvt/substrait-analysis';
import { resolvePostgresInputDataType, sourceFieldType } from '@dvt/postgres-projection';
import type { CanonicalNode } from '../../types/canonical';
import { resolveDbtProjectWorkspaceFilePath } from '../code/codeViewFileSelection';

export function canvasDbtModelDefinitionId(canvasId: string, uniqueId: string): string {
  return `dbt-model-reference:${canvasId}:${uniqueId}`;
}

export function createCanvasDbtModelDefinition(
  projection: DbtProjectGraphProjection,
  uniqueId: string
): CanonicalNode {
  const model = projection.nodes.find(
    (node) => node.uniqueId === uniqueId && node.resourceType === 'model'
  );
  const connectionRef = projection.executionTarget?.connectionRef;
  if (
    projection.freshness !== 'fresh' ||
    projection.authorityBinding.authority.kind !== 'dbt-project-files' ||
    !projection.capabilities.canPreview ||
    connectionRef?.provider !== 'postgres' ||
    model == null ||
    model.columns.length === 0 ||
    model.columns.some((column) => column.dataType == null)
  )
    throw new Error(
      'A current file model with a resolved output contract and PostgreSQL connection is required.'
    );
  const reference = WorkspaceDbtModelReferenceSchema.parse({
    schemaVersion: 'workspace-dbt-model-reference.v1',
    canvasId: projection.authorityBinding.canvasId,
    uniqueId,
    connectionRef,
    relationId: allocateDvtRelationId(),
    fields: model.columns.map((column) => ({
      fieldId: allocateDvtFieldId(),
      name: column.name,
      dataType: column.dataType,
      nullable: true,
    })),
  });
  return {
    id: canvasDbtModelDefinitionId(reference.canvasId, reference.uniqueId),
    name: model.name,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [...model.tags],
    ...(model.originalFilePath == null
      ? {}
      : {
          path: resolveDbtProjectWorkspaceFilePath(
            projection.authorityBinding.authority.projectRoot,
            model.originalFilePath
          ),
        }),
    ...(model.description == null ? {} : { description: model.description }),
    metadata: {
      dbtModelReference: reference,
      resourceType: 'model',
      packageName: model.packageName,
      columns: reference.fields.map((field) => ({
        name: field.name,
        type: field.dataType,
        nullable: field.nullable,
      })),
    },
  };
}

export function resolveCanvasDbtModelSignature(node: CanonicalNode) {
  const reference = readWorkspaceDbtModelReference(node);
  if (reference == null) return undefined;
  const document = createExternalProducerSignature({
    relationId: reference.relationId,
    names: [reference.canvasId, reference.uniqueId],
    fields: reference.fields.map((field) => ({
      ...field,
      type: sourceFieldType(resolvePostgresInputDataType(field.dataType), field.nullable),
    })),
  });
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  return { reference, document, index: indexed.index, connection: reference.connectionRef };
}
