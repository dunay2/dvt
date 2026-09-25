/** Owned concern: memoize guided operation choices and compatible Source candidates. */
import { useMemo } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { resolveCanvasRelationalOperationChoices } from './canvasRelationalOperationChoices';
import { resultOperationFacts } from './canvasResultOperationFacts';
import { resolveCanvasRelationalTreeAuthoringCandidates } from './canvasRelationalTreeAuthoringCandidates';
import { resolveCanvasRelationalTreeAuthoringChoices } from './canvasRelationalTreeAuthoringModel';
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

export function useCanvasRelationalTreeAuthoringOptions(
  args: Readonly<{
    editable: boolean;
    edges: readonly CanonicalEdge[];
    enabled: boolean;
    inputs: readonly CanvasDvtCompositionInput[];
    output: RelationAnalysisResult | null;
    session: CanvasRelationAnalysisSession | null;
    revision: number;
    nodes: readonly CanonicalNode[];
    operation: CanvasRelationalOperation | null;
    selectedInputIds: readonly string[];
    targetNodeId: string;
    appendInputId: string | null;
  }>
) {
  const choices = useMemo(
    () =>
      !args.enabled || args.selectedInputIds.length === 0
        ? []
        : args.appendInputId != null
          ? resolveCanvasRelationalOperationChoices(
              resultOperationFacts({
                ...args,
                input: args.inputs.find((input) => input.nodeId === args.appendInputId),
              })
            )
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
      args.appendInputId,
      args.output,
      args.session,
      args.revision,
    ]
  );
  const candidates = useMemo(
    () =>
      !args.enabled || args.operation == null
        ? []
        : resolveCanvasRelationalTreeAuthoringCandidates({
            inputs: args.inputs,
            output: args.output,
            session: args.session,
            revision: args.revision,
            operation: args.operation,
            selectedInputIds: args.selectedInputIds,
          }),
    [
      args.edges,
      args.enabled,
      args.inputs,
      args.output,
      args.session,
      args.revision,
      args.nodes,
      args.operation,
      args.selectedInputIds,
      args.targetNodeId,
    ]
  );
  return { candidates, choices } as const;
}
