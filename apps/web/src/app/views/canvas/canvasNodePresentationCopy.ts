/** Owned concern: adapt route-localized Canvas copy into the node-presentation DTO. */
import type { CanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationCopy.contract';
import type { CanvasViewCopy } from './canvasCopy.types';

export function buildCanvasNodePresentationCopy(copy: CanvasViewCopy): CanvasNodePresentationCopy {
  return {
    columnsLabel: copy.nodePresentationColumnsLabel,
    declaredColumnsDetailTemplate: copy.nodePresentationDeclaredColumnsDetailTemplate,
    inheritedColumnsDetailTemplate: copy.nodePresentationInheritedColumnsDetailTemplate,
    noColumnsDetail: copy.nodePresentationNoColumnsDetail,
    codeLabel: copy.nodePresentationCodeLabel,
    workspaceCodeDetailTemplate: copy.nodePresentationWorkspaceCodeDetailTemplate,
    generatedCodeDetailTemplate: copy.nodePresentationGeneratedCodeDetailTemplate,
    codeUnavailableMessage: copy.nodePresentationCodeUnavailableMessage,
    nodeActionsLabel: copy.nodePresentationActionsLabel,
    readyStatusLabel: copy.nodePresentationReadyStatusLabel,
    draftStatusLabel: copy.nodePresentationDraftStatusLabel,
    authoringTagLabel: copy.nodePresentationAuthoringTagLabel,
    kindLabels: {
      'dbt:source': copy.nodePresentationSourceKindLabel,
      'dvt:source': copy.nodePresentationSourceKindLabel,
      'dbt:model': copy.nodePresentationModelKindLabel,
      'dbt:test': copy.nodePresentationTestKindLabel,
    },
  };
}
