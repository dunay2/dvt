import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionOutput,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

export const sourceColumns = [
  { name: 'order_id', type: 'integer' },
  { name: 'customer', type: 'text' },
  { name: 'amount', type: 'numeric' },
];

export function sourceNode(id = 'source', columns = sourceColumns): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      columns,
      schema: 'public',
      tableName: id,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: `public.${id}`,
      },
    },
  };
}

export function emptyModel(): CanonicalNode {
  return {
    id: 'model',
    name: 'model',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

export function projectionDraft(
  source: CanonicalNode,
  names: readonly string[]
): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'public',
      table: source.id,
      sourceRef: source.metadata!.connectedSourceRef as ConnectedSourceRef,
      fields: (source.metadata!.columns as typeof sourceColumns).map(({ name, type }) => ({
        name,
        dataType: type,
      })),
    },
    targetNodeId: 'model',
    outputs: names.map((name) => ({ fieldId: `output:${name}`, name, sourceFieldName: name })),
  });
}

export function projectedModel(source: CanonicalNode, names: readonly string[]): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    emptyModel(),
    encodeDvtSubstraitProjectionDocument(projectionDraft(source, names))
  );
}

export function outputFixture(
  source: CanonicalNode,
  model?: CanonicalNode
): {
  draftSession: CanvasDraftSession;
  canonicalNodesById: Map<string, CanonicalNode>;
} {
  const nodes = model == null ? [source] : [source, model];
  const draftSession: CanvasDraftSession = {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: null,
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      pendingExplicitNodeIds: [],
      visibleEdges: model == null ? [] : [{ sourceId: source.id, targetId: model.id }],
    },
    localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
  return { draftSession, canonicalNodesById: new Map(nodes.map((node) => [node.id, node])) };
}

export function publishedOutputs(node: CanonicalNode): readonly DvtSubstraitProjectionOutput[] {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) throw new Error('Expected explicit canonical projection');
  const inspection = inspectDvtSubstraitProjectionDraft(
    decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
  );
  if (!inspection.ok) throw new Error('Expected inspectable projection');
  return inspection.projection.outputs;
}
