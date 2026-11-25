/** Adapt accepted file-model publications to native definition references, never copied SQL. */
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  readWorkspaceDbtModelReference,
  WorkspaceDbtModelReferenceSchema,
  type DbtProjectGraphProjection,
  type WorkspaceDbtModelReference,
  type ConnectionRef,
  workspaceNodeDefinitionId,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { createExternalProducerSignature, indexSubstraitRelations } from '@dvt/substrait-analysis';
import { resolvePostgresInputDataType, sourceFieldType } from '@dvt/postgres-projection';
import type { CanonicalNode } from '../../types/canonical';
import { resolveDbtProjectWorkspaceFilePath } from '../code/codeViewFileSelection';
import { createCanvasNodeInstance } from './canvasNodeInstance';

export type CanvasDbtModelCompositionReference = Readonly<{
  sourceId: string;
  sourceSignature: string;
  node: CanonicalNode;
  edges: readonly [];
  linkedReference: WorkspaceDbtModelReference;
}>;

export function canvasDbtModelCompositionSourceSignature(node: CanonicalNode): string {
  const signature = resolveCanvasDbtModelSignature(node);
  if (signature == null || workspaceNodeDefinitionId(node) != null)
    throw new Error('A registered dbt Model publication is required.');
  return jcsCanonicalize({ id: node.id, reference: signature.reference });
}

/** Allocate only a placement; authority remains on the current registered file definition. */
export function prepareCanvasDbtModelCompositionReference(
  args: Readonly<{
    sourceId: string;
    nodes: readonly CanonicalNode[];
  }>
): CanvasDbtModelCompositionReference {
  const definition = args.nodes.find((node) => node.id === args.sourceId);
  if (definition == null) throw new Error('The registered dbt Model is unavailable.');
  const sourceSignature = canvasDbtModelCompositionSourceSignature(definition);
  return {
    sourceId: definition.id,
    sourceSignature,
    linkedReference: readWorkspaceDbtModelReference(definition)!,
    node: createCanvasNodeInstance(definition, new Set(args.nodes.map((node) => node.name))),
    edges: [],
  };
}

export function canvasDbtModelDefinitionId(canvasId: string, uniqueId: string): string {
  return `dbt-model-reference:${canvasId}:${uniqueId}`;
}

function currentFileAuthority(
  projection: DbtProjectGraphProjection
): Extract<
  DbtProjectGraphProjection['authorityBinding']['authority'],
  { kind: 'dbt-project-files' }
> {
  if (projection.freshness !== 'fresh' || !projection.capabilities.canPreview)
    throw new Error('A current previewable file publication is required.');
  if (projection.authorityBinding.authority.kind !== 'dbt-project-files')
    throw new Error('The current dbt file authority is required.');
  return projection.authorityBinding.authority;
}

function currentDbtConnection(projection: DbtProjectGraphProjection): ConnectionRef {
  const connection = projection.executionTarget?.connectionRef;
  if (connection?.provider !== 'postgres') throw new Error('A PostgreSQL connection is required.');
  return connection;
}

function fileModelOutput(
  projection: DbtProjectGraphProjection,
  uniqueId: string
): DbtProjectGraphProjection['nodes'][number] {
  const model = projection.nodes.find(
    (node) => node.uniqueId === uniqueId && node.resourceType === 'model'
  );
  if (
    model == null ||
    model.columns.length === 0 ||
    model.columns.some((column) => column.dataType == null)
  )
    throw new Error('A resolved file Model output contract is required.');
  return model;
}

export function createCanvasDbtModelDefinition(
  projection: DbtProjectGraphProjection,
  uniqueId: string
): CanonicalNode {
  const authority = currentFileAuthority(projection);
  const connectionRef = currentDbtConnection(projection);
  const model = fileModelOutput(projection, uniqueId);
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
          path: resolveDbtProjectWorkspaceFilePath(authority.projectRoot, model.originalFilePath),
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
