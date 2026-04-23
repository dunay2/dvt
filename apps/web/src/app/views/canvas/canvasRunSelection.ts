/**
 * Owned concern: derive caller-owned start-run selection as canonical
 * execution selection from Canvas plan and workspace state without authoring
 * runtime execution identity.
 */
import type { ExecutionSelection } from '@dvt/contracts';
import { parseExecutionSelection } from '@dvt/contracts';

import type { PlanViewModel } from '../../types/plans';

export function collectPreviewSelection(
  selectedNodeIds: readonly string[],
  workspaceNodeIds: readonly string[]
): ExecutionSelection {
  const nodeIds = (selectedNodeIds.length > 0 ? selectedNodeIds : workspaceNodeIds).slice();

  return parseExecutionSelection({
    mode: 'explicit',
    nodeIds,
  });
}

export function collectPlanSelection(plan: PlanViewModel): ExecutionSelection {
  const selectedNodeIds = new Set<string>();

  for (const step of plan.steps) {
    for (const nodeId of step.nodes) {
      selectedNodeIds.add(nodeId);
    }
  }

  return parseExecutionSelection({
    mode: 'explicit',
    nodeIds: [...selectedNodeIds],
  });
}
