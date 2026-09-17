/** Owned concern: resolve an existing canonical JOIN into an editable structural seed. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  decodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { hasSameConnectedSourceRef } from './canvasDvtSubstraitJoinSourceResolution';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export type CanvasRelationalTreeExistingJoinDraft = Readonly<{
  draft: DvtSubstraitInnerJoinDraft;
  inputIds: readonly string[];
}>;

export function resolveCanvasRelationalTreeExistingJoinDraft(
  args: Readonly<{
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): CanvasRelationalTreeExistingJoinDraft | null {
  try {
    const authority = readDvtTransformAuthoringAuthority(args.transformNode);
    if (authority == null) return null;
    const draft = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
    const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
    if (!inspection.ok) return null;
    const connected = resolveCanvasDvtCompositionInputs({
      targetNodeId: args.transformNode.id,
      nodes: args.nodes,
      edges: args.edges,
    });
    const inputIds = inspection.projection.inputs.map((semantic) => {
      const matches = connected.filter(
        (input) =>
          input.schema === semantic.schema &&
          input.table === semantic.table &&
          hasSameConnectedSourceRef(input.sourceRef, semantic.sourceRef)
      );
      return matches.length === 1 ? matches[0]!.nodeId : null;
    });
    if (inputIds.some((nodeId) => nodeId == null)) return null;
    return { draft, inputIds: inputIds.filter((nodeId): nodeId is string => nodeId != null) };
  } catch {
    return null;
  }
}
