/** Owned concern: define the presentation contract for the relational-tree Workbench. */
import type { CanvasViewCopy } from './canvasCopy.types';

export type CanvasRelationalTreeWorkbenchCopy = Pick<
  CanvasViewCopy,
  | 'inspectorDbtOriginLabel'
  | 'inspectorDvtRelationalLeftInput'
  | 'inspectorDvtRelationalRightInput'
  | 'nodePresentationColumnsLabel'
  | 'reactFlowFitViewLabel'
  | 'reactFlowZoomInLabel'
  | 'reactFlowZoomOutLabel'
  | 'relationalTreeDetailLabel'
  | 'relationalTreeInputIdentityUnavailableMessage'
  | 'relationalTreeInvalidMessage'
  | 'relationalTreeLabel'
  | 'relationalTreeMissingLabel'
  | 'relationalTreeOutputLabel'
  | 'relationalTreeParticipatingLabel'
  | 'relationalTreePendingLabel'
  | 'relationalTreePrimaryInputLabel'
  | 'relationalTreeReadOnlyMessage'
  | 'relationalTreeSecondaryInputTemplate'
  | 'relationalTreeSourcesLabel'
  | 'relationalTreeUnavailableMessage'
>;

export type CanvasRelationalTreeCatalogueItem = Readonly<{
  key: string;
  label: string;
  state: 'participating' | 'pending' | 'missing';
  treeLocator: string | null;
}>;
