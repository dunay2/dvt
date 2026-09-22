/** Owned concern: exact physical dependency coverage for any number of canonical Read occurrences. */
import type { DvtSubstraitNInputJoinProjection } from '@dvt/postgres-projection';
import type { CanonicalEdge, CanonicalNode } from '../../../types/canonical';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from '../canvasDvtCompositionInputCatalog';
import type { DvtSubstraitJoinInput } from '../canvasDvtSubstraitJoinComposition';
import { hasSameConnectedSourceRef } from '../canvasDvtSubstraitJoinSourceResolution';

function matches(
  semantic: DvtSubstraitNInputJoinProjection['inputs'][number],
  graph: CanvasDvtCompositionInput
) {
  return (
    semantic.schema === graph.schema &&
    semantic.table === graph.table &&
    hasSameConnectedSourceRef(semantic.sourceRef, graph.sourceRef) &&
    semantic.fields.length === graph.fields.length &&
    semantic.fields.every((field, ordinal) => {
      const candidate = graph.fields[ordinal];
      return (
        candidate != null &&
        field.name === candidate.name &&
        field.dataType === candidate.joinDataType &&
        field.nullable === (candidate.nullable ?? true)
      );
    })
  );
}

export function resolveCanvasDvtJoinPhysicalBindings(
  args: Readonly<{
    targetNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    semanticInputs: DvtSubstraitNInputJoinProjection['inputs'];
  }>
): DvtSubstraitJoinInput[] | null {
  const candidates = resolveCanvasDvtCompositionInputs({
    ...args,
    targetNodeId: args.targetNode.id,
  });
  const connected = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
  );
  if (candidates.length !== connected.size) return null;
  const used = new Set<string>();
  const bindings: DvtSubstraitJoinInput[] = [];
  for (const semantic of args.semanticInputs) {
    const matching = candidates.filter((candidate) => matches(semantic, candidate));
    if (matching.length !== 1) return null;
    const input = matching[0]!;
    used.add(input.nodeId);
    bindings.push({
      source: input,
      fields: semantic.fields.map((field) => field.name),
      fieldTypes: semantic.fields.map((field) => field.dataType),
      fieldNullabilities: semantic.fields.map((field) => field.nullable),
    });
  }
  return used.size === connected.size ? bindings : null;
}
