/**
 * Owned concern: adapt explicit Transform output intent to the canonical selection command.
 * @baseline GH-3596: all output adapters share the same graph-derived eligibility.
 * @decision Forward publication denial and disconnected provenance to the existing session.
 * @consequence Source reinclusion retains its connection guard; no parallel output mutation exists.
 * @version 1.1.0
 */
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasProducerDocument } from './canvasProducerDocument';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import { relationOutputIntent, type RelationOutputIntent } from './canvasRelationOutputIntent';
import { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';

export async function applyCanvasRelationOutput(
  args: Readonly<{
    draftSession: CanvasDraftSession;
    canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
    intent: RelationOutputIntent;
    signal?: AbortSignal;
  }>
): Promise<CanvasColumnMappingResult> {
  const { draftSession: current, canonicalNodesById: nodes, intent, signal } = args;
  const node = resolveCanvasSessionNode(current, nodes, intent.nodeId);
  if (node == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  if (
    'source' in intent &&
    intent.source != null &&
    !current.workingSet.visibleEdges.some(
      (edge) => edge.sourceId === intent.source?.nodeId && edge.targetId === intent.nodeId
    )
  )
    return { outcome: 'rejected', reason: 'source_not_connected' };
  if (
    node.pluginId !== 'dvt' ||
    node.kind !== 'dvt:transform' ||
    node.metadata?.transformAuthoring == null
  )
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  const session = new CanvasRelationAnalysisSession('canvas-output-authoring');
  try {
    const catalog = new Map(nodes);
    for (const local of Object.values(current.localNodeCatalog ?? {})) catalog.set(local.id, local);
    const document = resolveCanvasProducerDocument(node, [...catalog.values()]) ?? null;
    const eligibility = resolveCanvasReadFieldEligibility({
      document,
      nodeId: node.id,
      nodes: [...catalog.values()],
      edges: current.workingSet.visibleEdges,
    });
    session.receive(document, eligibility.denied, eligibility.disconnected);
    const target = session.locate(session.rootId, session.revision);
    const inputs = await Promise.all(target.inputs.map((id) => session.query(id, signal)));
    const outputs = relationOutputIntent(relationOutputSlots(target, inputs), intent);
    if (target.relation.relType.case === 'read')
      await insertSelectedRelationTransform(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        signal,
      });
    const updated = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs,
      signal,
    });
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(
        current,
        applyDvtSubstraitSemanticDocument(node, encodeDvtSubstraitSemanticDocument(updated))
      ),
    };
  } catch {
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  } finally {
    session.dispose();
  }
}
