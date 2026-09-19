/** Owned concern: memoize guided operation choices and compatible Source candidates. */
import { useMemo } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  resolveCanvasRelationalTreeAuthoringCandidates,
  resolveCanvasRelationalTreeAuthoringChoices,
} from './canvasRelationalTreeAuthoringModel';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function useCanvasRelationalTreeAuthoringOptions(
  args: Readonly<{
    editable: boolean;
    edges: readonly CanonicalEdge[];
    enabled: boolean;
    inputs: readonly CanvasDvtCompositionInput[];
    joinDraft: DvtSubstraitJoinDraft | null;
    nodes: readonly CanonicalNode[];
    operation: CanvasRelationalOperation | null;
    selectedInputIds: readonly string[];
    targetNodeId: string;
  }>
) {
  const choices = useMemo(
    () =>
      !args.enabled || args.selectedInputIds.length === 0
        ? []
        : resolveCanvasRelationalTreeAuthoringChoices({
            edges: args.edges,
            inputs: args.inputs,
            nodes: args.nodes,
            readOnly: !args.editable,
            selectedInputIds: args.selectedInputIds,
            targetNodeId: args.targetNodeId,
          }),
    [
      args.editable,
      args.edges,
      args.enabled,
      args.inputs,
      args.nodes,
      args.selectedInputIds,
      args.targetNodeId,
    ]
  );
  const candidates = useMemo(
    () =>
      !args.enabled || args.operation == null
        ? []
        : resolveCanvasRelationalTreeAuthoringCandidates({
            edges: args.edges,
            inputs: args.inputs,
            joinDraft: args.joinDraft,
            nodes: args.nodes,
            operation: args.operation,
            selectedInputIds: args.selectedInputIds,
            targetNodeId: args.targetNodeId,
          }),
    [
      args.edges,
      args.enabled,
      args.inputs,
      args.joinDraft,
      args.nodes,
      args.operation,
      args.selectedInputIds,
      args.targetNodeId,
    ]
  );
  return { candidates, choices } as const;
}
