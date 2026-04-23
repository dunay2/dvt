/** Owned concern: derive caller-owned start-run selection from a persisted plan view without authoring execution identity. */
import type { PlanViewModel } from '../../types/plans';

export function collectPlanSelection(plan: PlanViewModel): readonly string[] {
  const selectedNodeIds = new Set<string>();

  for (const step of plan.steps) {
    for (const nodeId of step.nodes) {
      selectedNodeIds.add(nodeId);
    }
  }

  return [...selectedNodeIds];
}
