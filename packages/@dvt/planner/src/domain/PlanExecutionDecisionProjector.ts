/** Owned concern: project deterministic planner selection decisions. */
import {
  PLAN_EXECUTION_DECISION_REASON,
  PLAN_EXECUTION_DECISION_STATUS,
  type PlanExecutionDecision,
} from '@dvt/contracts';

import { binaryCompare } from './sorting.js';

export function projectPlanExecutionDecisions(input: {
  readonly allNodeIds: readonly string[];
  readonly selectedNodeIds: readonly string[];
  readonly selectedRootNodeIds: readonly string[];
}): readonly PlanExecutionDecision[] {
  const allNodeIds = [...new Set(input.allNodeIds)].sort(binaryCompare);
  const selectedNodeIds = [...new Set(input.selectedNodeIds)].sort(binaryCompare);
  const selectedNodeIdSet = new Set(selectedNodeIds);
  const selectedRootNodeIdSet = new Set(input.selectedRootNodeIds);
  const excludedNodeIds = allNodeIds.filter((nodeId) => !selectedNodeIdSet.has(nodeId));

  const decisions: PlanExecutionDecision[] = [];
  if (selectedNodeIds.length > 0 && excludedNodeIds.length > 0) {
    decisions.push({
      subjectId: 'selection',
      subjectKind: 'selection',
      status: PLAN_EXECUTION_DECISION_STATUS.partial,
      reasonCode: PLAN_EXECUTION_DECISION_REASON.boundedSelection,
      includedNodeIds: selectedNodeIds,
      excludedNodeIds,
    });
  }

  for (const nodeId of allNodeIds) {
    if (!selectedNodeIdSet.has(nodeId)) {
      decisions.push({
        subjectId: nodeId,
        subjectKind: 'node',
        status: PLAN_EXECUTION_DECISION_STATUS.skip,
        reasonCode: PLAN_EXECUTION_DECISION_REASON.outsideSelectedClosure,
      });
      continue;
    }

    decisions.push({
      subjectId: nodeId,
      subjectKind: 'node',
      status: PLAN_EXECUTION_DECISION_STATUS.run,
      reasonCode: selectedRootNodeIdSet.has(nodeId)
        ? PLAN_EXECUTION_DECISION_REASON.selectedRoot
        : PLAN_EXECUTION_DECISION_REASON.selectedClosure,
    });
  }

  return decisions;
}
