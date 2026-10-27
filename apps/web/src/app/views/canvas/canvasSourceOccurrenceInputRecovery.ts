/** Prepare explicit physical Input recovery and exact occurrence Output on one unpublished candidate. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasColumnMappingSource } from './canvasColumnMappingModel';
import { bindCanvasInputField } from './canvasInputBindingAuthoring';
import { readCanvasInputBindings } from './canvasInputBindings';
import { canvasDraftSession } from './canvasDraftSession';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { physicalReadMatches } from './canvasSubstraitInputBinding';
import { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  readCanvasSourceOccurrenceOutputSelection,
  sourceOccurrenceOutputEdits,
} from './canvasSourceOccurrenceOutputSlots';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';

export type CanvasSourceInputRecovery = Readonly<{
  fieldsByRelationId: ReadonlyMap<string, ReadonlySet<string>>;
  busy: boolean;
  restore: (relationId: string, fieldId: string) => Promise<boolean>;
}>;

export async function prepareCanvasSourceOccurrenceInputRecovery(
  args: Readonly<{
    nodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    document: SubstraitDocument;
    relationId: string;
    fieldId: string;
    sourceNodeId: string;
    additions: readonly CanvasColumnMappingSource[];
    signal?: AbortSignal;
  }>
) {
  args.signal?.throwIfAborted();
  const indexed = indexSubstraitRelations(args.document);
  if (!indexed.ok) throw indexed.error;
  const read = indexed.index.relations.get(args.relationId);
  const field = read?.fields.find(
    (candidate) => candidate.fieldId === args.fieldId && candidate.parentFieldId == null
  );
  const producer = args.nodes.find((node) => node.id === args.sourceNodeId);
  const edge = args.edges.find(
    (candidate) => candidate.sourceId === args.sourceNodeId && candidate.targetId === args.nodeId
  );
  const input =
    producer == null || edge == null ? null : resolveCanvasPhysicalCompositionInput(producer, edge);
  if (
    read == null ||
    read.binding.producerRef != null ||
    field?.displayName == null ||
    input?.sourceRef == null ||
    !physicalReadMatches(read, input)
  )
    throw new Error('Source Input recovery identity is unavailable.');
  if (
    input.inputBindings == null ||
    input.inputBindings.fields.some((binding) => binding.producerFieldId === field.displayName)
  )
    throw new Error('Source field already belongs to Model Input.');
  const additions = [
    ...new Map(
      [...args.additions, { nodeId: producer!.id, columnId: field.displayName }].map((addition) => [
        JSON.stringify([addition.nodeId, addition.columnId]),
        addition,
      ])
    ).values(),
  ];
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  let candidate = canvasDraftSession.machine.bootstrap({
    remoteDraft: null,
    canonicalNodeIds: args.nodes.map((node) => node.id),
    canonicalEdges: args.edges.map((current) => ({
      sourceId: current.sourceId,
      targetId: current.targetId,
      inputBindings: readCanvasInputBindings(current),
    })),
  });
  for (const source of additions) {
    const result = await bindCanvasInputField({
      draftSession: candidate,
      canonicalNodesById: nodes,
      target: { nodeId: args.nodeId },
      source,
      signal: args.signal,
    });
    if (result.outcome !== 'applied')
      throw new Error(`Source Input recovery rejected: ${result.reason}`);
    candidate = result.draftSession;
  }
  args.signal?.throwIfAborted();
  const edges = args.edges.map((current) => {
    const updated = candidate.workingSet.visibleEdges.find(
      (entry) => entry.sourceId === current.sourceId && entry.targetId === current.targetId
    );
    return updated?.inputBindings == null
      ? current
      : { ...current, metadata: { ...current.metadata, inputBindings: updated.inputBindings } };
  });
  const eligibility = resolveCanvasReadFieldEligibility({
    document: args.document,
    nodeId: args.nodeId,
    nodes: args.nodes,
    edges,
  });
  const session = new CanvasRelationAnalysisSession(
    'source-input-recovery',
    input.sourceRef.connectionRef
  );
  try {
    session.receive(args.document, eligibility.denied, eligibility.disconnected);
    const selection = await readCanvasSourceOccurrenceOutputSelection(
      session,
      args.relationId,
      session.revision,
      args.signal
    );
    const contribution = selection.fields.find((entry) => entry.id === args.fieldId);
    if (contribution?.available !== true)
      throw new Error('Source Output has no admitted direct contribution.');
    const document = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      signal: args.signal,
      outputs: sourceOccurrenceOutputEdits(selection, new Map([[args.fieldId, true]])),
    });
    args.signal?.throwIfAborted();
    return { document, edges, additions };
  } finally {
    session.dispose();
  }
}
