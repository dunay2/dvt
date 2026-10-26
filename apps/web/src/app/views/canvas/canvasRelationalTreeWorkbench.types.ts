/** Owned concern: define the presentation contract for the relational-tree Workbench. */
import type { CanvasViewCopy } from './canvasCopy.types';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftApplyResult,
  CanvasInspectorNodeDraftInputChanges,
} from './canvasInspectorAuthoring.types';
import type { GraphNodeInputMapping } from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasOperationPreviewPorts } from './CanvasOperationDataPreview';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { DvtRelationalAuthoringDraftV1 } from '@dvt/contracts';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';

export type CanvasRelationalTreeWorkbenchProps = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  copy: CanvasRelationalTreeWorkbenchCopy;
  authoring?: CanvasRelationalTreeAuthoringContract;
  actionsHost?: HTMLElement | null;
  preview?: CanvasOperationPreviewPorts;
}>;

export type CanvasRelationalTreeApplyResult =
  | CanvasInspectorNodeDraftApplyResult
  | Readonly<{ outcome: 'rejected'; reason: 'command_unavailable' | 'source_output_unavailable' }>;

export type RelationalApplyRejection = Extract<
  CanvasRelationalTreeApplyResult,
  { outcome: 'rejected' }
>;

export type CanvasRelationalTreeApplyCommandArgs = {
  authoring?: CanvasRelationalTreeAuthoringContract;
  editable: boolean;
  relationalAuthoringDraft?: DvtRelationalAuthoringDraftV1 | null;
  cleared?: boolean;
  joinDraft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  reject: (rejection: RelationalApplyRejection) => void;
  reset: () => void;
  transformNode: CanonicalNode;
  inputChanges?: CanvasInspectorNodeDraftInputChanges;
};

type SynchronousApplyArgs = Omit<
  CanvasRelationalTreeApplyCommandArgs,
  'authoring' | 'inputChanges'
> & {
  authoring?: Omit<CanvasRelationalTreeAuthoringContract, 'onApplyNodeDraft'> & {
    onApplyNodeDraft: (
      nodeId: string,
      draft: CanvasInspectorNodeDraft
    ) => CanvasInspectorNodeDraftApplyResult;
  };
  inputChanges?: never;
};

export type CanvasRelationalTreeApplyCommandFactory = {
  (args: SynchronousApplyArgs): (document?: SubstraitDocument) => CanvasRelationalTreeApplyResult;
  (
    args: CanvasRelationalTreeApplyCommandArgs
  ): (
    document?: SubstraitDocument,
    changes?: CanvasInspectorNodeDraftInputChanges
  ) => CanvasRelationalTreeApplyResult | Promise<CanvasRelationalTreeApplyResult>;
};

export type CanvasRelationalTreeAuthoringContract = Readonly<{
  canEditNode: boolean;
  onApplyNodeDraft: (
    nodeId: string,
    draft: CanvasInspectorNodeDraft,
    changes?: CanvasInspectorNodeDraftInputChanges
  ) => CanvasInspectorNodeDraftApplyResult | Promise<CanvasInspectorNodeDraftApplyResult>;
  onMapInput?: (mapping: GraphNodeInputMapping) => void;
  onRemoveInput?: (mapping: GraphNodeInputMapping) => void;
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
  | 'canvasContextMenuRemoveEdgeLabel'
  | 'canvasNodeContextPropertiesLabel'
  | 'reactFlowFitViewLabel'
  | 'reactFlowEdgeDescription'
  | 'reactFlowZoomInLabel'
  | 'reactFlowZoomOutLabel'
  | 'relationalTreeDetailLabel'
  | 'relationalTreeCanvasLabel'
  | 'relationalTreeComposeAction'
  | 'relationalTreeDropSourceMessage'
  | 'relationalTreePendingInputsMessage'
  | 'relationalTreeInputIdentityUnavailableMessage'
  | 'relationalTreeProducerFieldsUnavailableMessage'
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
