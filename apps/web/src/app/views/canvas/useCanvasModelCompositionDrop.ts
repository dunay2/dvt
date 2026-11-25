/**
 * Owned concern: Stage working definitions and local Reads in the existing discardable Model session.
 * Reason to change: Model composition gesture-to-session coordination changes.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Delegate semantic preparation and dependency admission before opening the editing transaction.
 * @consequence Cancel owns all staged copies and admitted gestures allocate distinct identities.
 * @version 1.0.0
 */
import { useMemo } from 'react';
import { readWorkspaceDbtModelReference } from '@dvt/contracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import {
  canvasModelCopySourceSignature,
  prepareCanvasModelWorkingCopy,
} from './canvasModelWorkingCopy';
import { prepareCanvasModelCompositionCandidate } from './canvasModelCompositionCandidate';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { nextSourceOccurrenceAlias } from './relational-source-occurrence/sourceOccurrenceAlias';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  assertCanvasModelCompositionPhysicalInputAvailable,
  readCanvasModelCompositionPhysicalInputs,
} from './canvasModelCompositionPhysicalAdmission';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { SourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import {
  canvasDbtModelCompositionSourceSignature,
  prepareCanvasDbtModelCompositionReference,
} from './canvasDbtModelCompositionDiscovery';
import type { CanvasDbtModelDiscovery } from './canvasDbtModelCompositionDiscovery';

export function useCanvasModelCompositionDrop(
  args: Readonly<{
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    targetId: string;
    enabled: boolean;
    pluginPorts: PluginPortMap;
    state: ReturnType<typeof useCanvasRelationalTreeDraftState>;
    start: () => boolean;
    analysis: Readonly<{ session: CanvasRelationAnalysisSession; revision: number }> | null;
    discoveries: ReadonlyMap<string, CanvasDbtModelDiscovery>;
    inputs: readonly CanvasDvtCompositionInput[];
    occurrences: Pick<SourceOccurrenceActions, 'drop'>;
  }>
) {
  const { edges, enabled, targetId } = args;
  const nodes = useMemo(
    () => [
      ...new Map(
        [...args.nodes, ...[...args.discoveries.values()].map((item) => item.definition)].map(
          (node) => [node.id, node]
        )
      ).values(),
    ],
    [args.nodes, args.discoveries]
  );
  const physicalInputs = useMemo(
    () => readCanvasModelCompositionPhysicalInputs({ nodes, edges, targetId, inputs: args.inputs }),
    [nodes, edges, targetId, args.inputs]
  );
  const nodeIds = useMemo(
    () =>
      new Set(
        enabled
          ? nodes
              .filter((node) => {
                try {
                  if (physicalInputs.has(node.id)) return physicalInputs.get(node.id) != null;
                  if (readWorkspaceDbtModelReference(node) != null)
                    canvasDbtModelCompositionSourceSignature(node);
                  else canvasModelCopySourceSignature({ nodes, edges, sourceId: node.id });
                  assertCanvasModelCompositionPhysicalInputAvailable({
                    nodes,
                    edges,
                    sourceId: node.id,
                    targetId,
                  });
                  return true;
                } catch {
                  return false;
                }
              })
              .map((node) => node.id)
          : []
      ),
    [nodes, edges, enabled, targetId, physicalInputs]
  );
  return {
    nodeIds,
    occurrenceNodeIds: new Set(
      [...physicalInputs]
        .filter(([id, input]) => input != null && nodeIds.has(id))
        .map(([id]) => id)
    ),
    linkedNodeIds: new Set(
      nodes
        .filter((node) => nodeIds.has(node.id) && readWorkspaceDbtModelReference(node) != null)
        .map((node) => node.id)
    ),
    copy: (sourceId: string): boolean => {
      if (!args.enabled || !nodeIds.has(sourceId)) return false;
      try {
        const input = physicalInputs.get(sourceId);
        if (input != null) return args.occurrences.drop(input.nodeId) != null;
        const source = nodes.find((node) => node.id === sourceId)!;
        const copy =
          readWorkspaceDbtModelReference(source) == null
            ? prepareCanvasModelWorkingCopy({ ...args, sourceId })
            : prepareCanvasDbtModelCompositionReference({
                nodes,
                sourceId,
                ...(args.discoveries.get(sourceId) == null
                  ? {}
                  : { discovery: args.discoveries.get(sourceId)! }),
              });
        const candidate = prepareCanvasModelCompositionCandidate({ ...args, nodes, copy });
        const occurrence = createPendingSourceOccurrence(candidate.input);
        const occupied = new Set([
          ...(args.analysis?.session.sourceAliases(args.analysis.revision) ?? []),
          ...args.state.pendingSources.map((source) => source.read.binding.displayName),
        ]);
        const displayName = nextSourceOccurrenceAlias(
          occurrence.read.binding.displayName,
          occupied
        );
        if (!args.start()) return false;
        args.state.appendModelCopy(candidate.addition, {
          ...occurrence,
          read: { ...occurrence.read, binding: { ...occurrence.read.binding, displayName } },
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}
