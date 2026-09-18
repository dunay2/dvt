/** Owned concern: define the presentation contract for the relational-tree Workbench. */
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';

export type CanvasRelationalTreeAuthoringContract = Readonly<{
  canEditNode: boolean;
  onApplyNodeDraft: (nodeId: string, draft: CanvasInspectorNodeDraft) => void;
}>;

export type CanvasRelationalTreeWorkbenchCopy = Pick<
  CanvasViewCopy,
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
  | 'inspectorDvtSubstraitAppendInputAction'
  | 'inspectorDvtSubstraitAppendInputTitle'
  | 'inspectorDvtSubstraitConnectedFieldLabel'
  | 'inspectorDvtSubstraitExistingFieldLabel'
  | 'inspectorDvtSubstraitUnionAllAction'
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
