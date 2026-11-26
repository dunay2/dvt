/** Transfer explicit placement through unique correspondence; capture compact placement only on request. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { canvasModelLayoutSignatures } from './canvasModelLayoutSignatures';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import {
  CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
  layoutCanvasRelationalTree,
  type CardPosition,
} from './canvasRelationalTreeGeometry';

function uniqueLayoutSignatures(signatures: ReadonlyMap<string, string>) {
  const identities = new Map<string, string | null>();
  for (const [id, signature] of signatures)
    identities.set(signature, identities.has(signature) ? null : id);
  return identities;
}

export function captureCanvasModelLayout(
  document: SubstraitDocument,
  positions: ReadonlyMap<string, CardPosition>
): ReadonlyMap<string, CardPosition> {
  const old = indexSubstraitRelations(document);
  if (!old.ok) return positions;
  const root = buildCanvasRelationalTreeRelation({
    index: old.index,
    digest: document.sidecar.semanticPlanSha256,
  });
  const layout = layoutCanvasRelationalTree(root, new Map(), positions);
  const compact = new Map(
    layout.nodes.map((card) => [card.node.relationId!, { x: card.x, y: card.y }])
  );
  if (layout.output != null)
    compact.set(CANVAS_RELATIONAL_OUTPUT_POSITION_ID, { x: layout.output.x, y: layout.output.y });
  return compact;
}

export function reconcileCanvasModelLayout(
  previous: SubstraitDocument,
  current: SubstraitDocument,
  positions: ReadonlyMap<string, CardPosition>
): ReadonlyMap<string, CardPosition> {
  if (!indexSubstraitRelations(previous).ok) return positions;
  const next = new Map<string, CardPosition>();
  for (const [id, oldId] of correspondingLayoutIdentities(previous, current)) {
    const position = positions.get(oldId);
    if (position != null) next.set(id, position);
  }
  const output = positions.get(CANVAS_RELATIONAL_OUTPUT_POSITION_ID);
  if (output != null) next.set(CANVAS_RELATIONAL_OUTPUT_POSITION_ID, output);
  return next;
}

function correspondingLayoutIdentities(previous: SubstraitDocument, current: SubstraitDocument) {
  const oldSignatures = canvasModelLayoutSignatures(previous);
  const nextSignatures = canvasModelLayoutSignatures(current);
  const oldUnique = uniqueLayoutSignatures(oldSignatures);
  const nextUnique = uniqueLayoutSignatures(nextSignatures);
  const matches = new Map<string, string>();
  for (const [id, signature] of nextSignatures) {
    const oldId = oldSignatures.has(id)
      ? id
      : nextUnique.get(signature) === id
        ? oldUnique.get(signature)
        : null;
    if (oldId != null) matches.set(id, oldId);
  }
  return matches;
}
