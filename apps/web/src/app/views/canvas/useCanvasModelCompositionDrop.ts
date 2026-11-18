/**
 * Owned concern: Stage working definitions and local Reads in the existing discardable Model session.
 * Reason to change: Model composition gesture-to-session coordination changes.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Delegate semantic preparation and dependency admission before opening the editing transaction.
 * @consequence Cancel owns all staged copies and admitted gestures allocate distinct identities.
 * @version 1.0.0
 */
import { useMemo } from 'react';
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
import { assertCanvasModelCompositionPhysicalInputAvailable } from './canvasModelCompositionPhysicalAdmission';

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
  }>
) {
  const { nodes, edges, enabled, targetId } = args;
  const nodeIds = useMemo(
    () =>
      new Set(
        enabled
          ? nodes
              .filter((node) => {
                try {
                  canvasModelCopySourceSignature({ nodes, edges, sourceId: node.id });
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
    [nodes, edges, enabled, targetId]
  );
  return {
    nodeIds,
    copy: (sourceId: string): boolean => {
      if (!args.enabled || !nodeIds.has(sourceId)) return false;
      try {
        const copy = prepareCanvasModelWorkingCopy({ ...args, sourceId });
        const candidate = prepareCanvasModelCompositionCandidate({ ...args, copy });
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
