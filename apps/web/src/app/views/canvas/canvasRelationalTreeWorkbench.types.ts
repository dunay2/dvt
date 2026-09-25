/** Owned concern: define the presentation contract for the relational-tree Workbench. */
import type { CanvasViewCopy } from './canvasCopy.types';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftApplyResult,
} from './canvasInspectorAuthoring.types';

export type CanvasRelationalTreeApplyResult =
  | CanvasInspectorNodeDraftApplyResult
  | Readonly<{ outcome: 'rejected'; reason: 'command_unavailable' }>;

export type RelationalApplyRejection = Extract<
  CanvasRelationalTreeApplyResult,
  { outcome: 'rejected' }
>;

export type CanvasRelationalTreeAuthoringContract = Readonly<{
  canEditNode: boolean;
  onApplyNodeDraft: (
    nodeId: string,
    draft: CanvasInspectorNodeDraft
  ) => CanvasInspectorNodeDraftApplyResult;
}>;

export type CanvasRelationalTreeWorkbenchCopy = Pick<
  CanvasViewCopy,
  | 'operationReadLabel'
  | 'operationFilterLabel'
  | 'operationAggregateLabel'
  | 'operationWindowLabel'
  | 'operationSortLabel'
  | 'operationFetchLabel'
  | 'operationUnsupportedLabel'
  | 'inspectorDbtOriginLabel'
  | 'inspectorDvtRelationalApply'
  | 'inspectorDvtRelationalAvailable'
  | 'inspectorDvtRelationalCancel'
  | 'inspectorDvtRelationalLeftInput'
  | 'inspectorDvtRelationalNeedsPredicate'
  | 'inspectorDvtRelationalNeedsSchemaAlignment'
  | 'inspectorDvtRelationalOperationTitle'
  | 'inspectorDvtRelationalReadOnly'
  | 'inspectorDvtRelationalRightInput'
  | 'inspectorDvtRelationalTargetUnavailable'
  | 'inspectorDvtRelationalUnavailable'
  | 'inspectorDvtSubstraitInnerJoinAction'
  | 'inspectorDvtSubstraitLeftJoinAction'
  | 'inspectorDvtSubstraitRightJoinAction'
  | 'inspectorDvtSubstraitFullOuterJoinAction'
  | 'inspectorDvtSubstraitLeftSemiJoinAction'
  | 'inspectorDvtSubstraitLeftAntiJoinAction'
  | 'inspectorDvtSubstraitRightSemiJoinAction'
  | 'inspectorDvtSubstraitRightAntiJoinAction'
  | 'inspectorDvtSubstraitCrossJoinAction'
  | 'inspectorDvtSubstraitJoinTypeLabel'
  | 'inspectorDvtSubstraitJoinTypeImpactHint'
  | 'inspectorDvtSubstraitLeftJoinRolesHint'
  | 'inspectorDvtSubstraitRightJoinRolesHint'
  | 'inspectorDvtSubstraitFullOuterJoinRolesHint'
  | 'inspectorDvtSubstraitLeftFilteringJoinRolesHint'
  | 'inspectorDvtSubstraitRightFilteringJoinRolesHint'
  | 'inspectorDvtSubstraitAppendInputAction'
  | 'inspectorDvtSubstraitAppendInputTitle'
  | 'inspectorDvtSubstraitConnectedFieldLabel'
  | 'inspectorDvtSubstraitExistingFieldLabel'
  | 'inspectorDvtSubstraitUnionAllAction'
  | 'inspectorDvtSubstraitUnionDistinctAction'
  | 'inspectorDvtSubstraitIntersectDistinctAction'
  | 'inspectorDvtSubstraitExceptDistinctAction'
  | 'inspectorDvtSubstraitIntersectAllAction'
  | 'inspectorDvtSubstraitExceptAllAction'
  | 'nodePresentationColumnsLabel'
  | 'reactFlowFitViewLabel'
  | 'reactFlowZoomInLabel'
  | 'reactFlowZoomOutLabel'
  | 'relationalTreeDetailLabel'
  | 'relationalTreeCanvasLabel'
  | 'relationalTreeComposeAction'
  | 'relationalTreeDropSourceMessage'
  | 'relationalTreePendingInputsMessage'
  | 'relationalTreeInputIdentityUnavailableMessage'
  | 'relationalTreeInvalidMessage'
  | 'relationalTreeLabel'
  | 'relationalTreeValidMessage'
  | 'relationalTreeMissingLabel'
  | 'relationalTreeOutputLabel'
  | 'relationalTreeParticipatingLabel'
  | 'relationalTreePendingLabel'
  | 'relationalTreePrimaryInputLabel'
  | 'relationalTreePrimarySlotLabel'
  | 'relationalTreeProjectOperationLabel'
  | 'relationalTreeExpressionStageLabel'
  | 'relationalTreeExpressionStageSummaryTemplate'
  | 'relationalTreeFieldTransformationStageLabel'
  | 'relationalTreeFieldTransformationStageSummaryTemplate'
  | 'relationalTreeReadOnlyMessage'
  | 'relationalTreeSecondaryInputTemplate'
  | 'relationalTreeSecondarySlotLabel'
  | 'relationalTreeSelectFirstSourceMessage'
  | 'relationalTreeSelectNextSourceMessage'
  | 'relationalTreeSelectOperationMessage'
  | 'relationalTreeSourceActionHint'
  | 'relationalTreeSelectedInputsLabel'
  | 'relationalTreeSourcesLabel'
  | 'relationalTreeUnavailableMessage'
>;

export type CanvasRelationalTreeCatalogueItem = Readonly<{
  key: string;
  label: string;
  sourceNodeId: string | null;
  state: 'participating' | 'pending' | 'missing';
  treeLocator: string | null;
  fieldCount: number | null;
  selectable?: boolean;
  selected?: boolean;
  reason?: string | null;
}>;
