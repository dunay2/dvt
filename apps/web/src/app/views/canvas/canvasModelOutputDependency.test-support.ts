/**
 * Owned concern: compose real producer-reference fixtures for admission and retained read classification.
 * @baseline ADR-0064 / GH-3628: current producer validity is distinct from retained consumer compatibility.
 * @decision Reproduce missing publication and coherent source-type updates through real canonical commands.
 * @consequence Negative cases cannot pass merely because their producer was already malformed.
 * @version 1.1.0
 */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { create } from '@bufbuild/protobuf';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type { CanvasDraftSession } from './canvasDraftSession';
import { emptyModel, projectedModel, sourceNode } from './canvasColumnOutputAuthoring.test-support';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createSourceJoin } from './canvasSourceJoin';
import { toSourceRelationInput } from './canvasSourceRelation';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

export function modelDependencyDocument(node: CanonicalNode) {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) throw new Error('Expected canonical model authority');
  return decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
}

export async function selectModelDependencyOutputs(
  node: CanonicalNode,
  outputNames: readonly string[],
  aliases: Readonly<Record<string, string>> = {}
): Promise<CanonicalNode> {
  const session = new CanvasRelationAnalysisSession(node.id);
  try {
    session.receive(modelDependencyDocument(node));
    const root = session.locate(session.rootId, session.revision);
    const inputs = await Promise.all(root.inputs.map((id) => session.query(id)));
    const slots = relationOutputSlots(root, inputs);
    const outputs = outputNames.map((name) => {
      const field = slots.find((slot) => slot.name === name);
      if (field == null) throw new Error(`Missing output fixture field ${name}`);
      return { slot: field.slot, alias: aliases[name] ?? name };
    });
    const document = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs,
    });
    return applyDvtSubstraitSemanticDocument(node, encodeDvtSubstraitSemanticDocument(document));
  } finally {
    session.dispose();
  }
}

export async function createModelOutputDependencyFixture() {
  const source = sourceNode(
    'orders',
    ['order_id', 'customer', 'amount'].map((name) => ({ name, type: 'text' }))
  );
  const producer = {
    ...projectedModel(source, ['order_id', 'customer', 'amount']),
    name: 'Model 1',
  };
  const right = sourceNode(
    'client',
    ['order_id', 'country'].map((name) => ({ name, type: 'text' }))
  );
  const emptyConsumer = { ...emptyModel(), id: 'model2', name: 'Model 2' };
  const edges: CanonicalEdge[] = [
    { id: 'orders-model', sourceId: source.id, targetId: producer.id, relation: 'lineage' },
    { id: 'model-model2', sourceId: producer.id, targetId: emptyConsumer.id, relation: 'lineage' },
    { id: 'client-model2', sourceId: right.id, targetId: emptyConsumer.id, relation: 'lineage' },
  ];
  const inputs = resolveCanvasDvtCompositionInputs({
    targetNodeId: emptyConsumer.id,
    nodes: [source, producer, right, emptyConsumer],
    edges,
  });
  const leftInput = inputs.find((input) => input.nodeId === producer.id);
  const rightInput = inputs.find((input) => input.nodeId === right.id);
  if (leftInput == null || rightInput == null) throw new Error('Expected canonical JOIN inputs');
  const consumerDocument = createSourceJoin({
    targetNodeId: emptyConsumer.id,
    left: toSourceRelationInput(leftInput),
    right: toSourceRelationInput(rightInput),
    leftFieldName: 'order_id',
    rightFieldName: 'order_id',
    outputs: [
      { side: 0, fieldName: 'customer', name: 'customer' },
      { side: 0, fieldName: 'amount', name: 'amount' },
      { side: 1, fieldName: 'country', name: 'country' },
    ],
  });
  const consumer = applyDvtSubstraitSemanticDocument(
    emptyConsumer,
    encodeDvtSubstraitSemanticDocument(consumerDocument)
  );
  const nodes = [source, producer, right, consumer];
  const canonicalNodesById = new Map(nodes.map((node) => [node.id, node]));
  const draftSession: CanvasDraftSession = {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: 'revision-1',
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      visibleEdges: edges.map(({ sourceId, targetId }) => ({ sourceId, targetId })),
      pendingExplicitNodeIds: [],
    },
  };
  return {
    source,
    producer,
    right,
    consumer,
    nodes,
    edges,
    draftSession,
    canonicalNodesById,
    producerDocument: modelDependencyDocument(producer),
    consumerDocument: modelDependencyDocument(consumer),
  };
}

/** Keep the current producer valid while its consumer retains a required missing field and old type. */
export async function createIncompatibleRetainedModelFixture(): Promise<
  Awaited<ReturnType<typeof createModelOutputDependencyFixture>>
> {
  const graph = await createModelOutputDependencyFixture();
  const narrowed = await selectModelDependencyOutputs(graph.producer, ['order_id', 'customer']);
  const document = modelDependencyDocument(narrowed);
  const root = document.plan.relations[0]!.relType;
  if (
    root.case !== 'root' ||
    root.value.input?.relType.case !== 'project' ||
    root.value.input.relType.value.input?.relType.case !== 'read'
  )
    throw new Error('Expected producer projection');
  root.value.input.relType.value.input.relType.value.baseSchema!.struct!.types[1] = create(
    TypeSchema,
    {
      kind: { case: 'i64', value: { nullability: Type_Nullability.NULLABLE } },
    }
  );
  const producer = applyDvtSubstraitSemanticDocument(
    narrowed,
    encodeDvtSubstraitSemanticDocument(document)
  );
  const columns = graph.source.metadata!.columns as Array<{ name: string; type: string }>;
  const source = {
    ...graph.source,
    metadata: {
      ...graph.source.metadata,
      columns: columns.map((column) =>
        column.name === 'customer' ? { ...column, type: 'bigint' } : column
      ),
    },
  };
  const nodes = graph.nodes.map((node) =>
    node.id === producer.id ? producer : node.id === source.id ? source : node
  );
  return {
    ...graph,
    source,
    producer,
    nodes,
    canonicalNodesById: new Map(nodes.map((node) => [node.id, node])),
    producerDocument: modelDependencyDocument(producer),
  };
}
