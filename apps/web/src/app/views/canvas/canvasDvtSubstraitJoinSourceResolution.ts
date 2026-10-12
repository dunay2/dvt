/** Resolve connected source occurrences without table-specific JOIN shape recognition. */
import type { ConnectedSourceRef } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtInitialJoinPairForInputs } from './canvasDvtInitialJoinModel';
import { hasConnectedRelationInputs } from './canvasConnectedRelationInputs';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

export function hasSameConnectedSourceRef(
  first: ConnectedSourceRef,
  second: ConnectedSourceRef
): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.sourceObjectId === second.sourceObjectId &&
    hasSameConnectionRef(first.connectionRef, second.connectionRef)
  );
}

type ConnectedModel = Readonly<{
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>;

export function resolveDvtSubstraitJoinEntry(
  args: ConnectedModel & { requirePersistedAuthority?: boolean }
) {
  if (
    args.targetNode.pluginId !== 'dvt' ||
    args.targetNode.kind !== 'dvt:transform' ||
    args.targetNode.role !== 'transform'
  )
    return null;
  const connected = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
  );
  const inputs = [
    ...resolveCanvasDvtCompositionInputs({ ...args, targetNodeId: args.targetNode.id }),
  ].sort((left, right) => (left.nodeId < right.nodeId ? -1 : left.nodeId > right.nodeId ? 1 : 0));
  if (
    connected.size !== 2 ||
    inputs.length !== 2 ||
    inputs.some((input) => input.fields.some((field) => field.joinDataType == null))
  )
    return null;
  const [left, right] = inputs;
  const pair = resolveCanvasDvtInitialJoinPairForInputs(left!, right!);
  if (pair == null) return null;
  if (args.requirePersistedAuthority) {
    try {
      const authority = readDvtTransformAuthoringAuthority(args.targetNode);
      if (
        authority == null ||
        !hasConnectedRelationInputs(
          decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
          inputs
        )
      )
        return null;
    } catch {
      return null;
    }
  }
  return { left: left!, right: right!, inputs, pair, targetNodeId: args.targetNode.id };
}
