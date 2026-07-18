/** Owned concern: adapt route-localized Canvas copy into the node-presentation DTO. */
import type { CanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanvasViewCopy } from './canvasCopy.types';

export function buildCanvasNodePresentationCopy(copy: CanvasViewCopy): CanvasNodePresentationCopy {
  return {
    columnsLabel: copy.nodePresentationColumnsLabel,
    declaredColumnsDetailTemplate: copy.nodePresentationDeclaredColumnsDetailTemplate,
    inheritedColumnsDetailTemplate: copy.nodePresentationInheritedColumnsDetailTemplate,
    noColumnsDetail: copy.nodePresentationNoColumnsDetail,
    codeLabel: copy.nodePresentationCodeLabel,
    workspaceCodeDetailTemplate: copy.nodePresentationWorkspaceCodeDetailTemplate,
    codeUnavailableMessage: copy.nodePresentationCodeUnavailableMessage,
  };
}
