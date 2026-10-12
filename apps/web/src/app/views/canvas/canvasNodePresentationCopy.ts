/** Owned concern: adapt route-localized Canvas copy into the node-presentation DTO. */
import type { CanvasNodePresentationCopy } from '../../components/canvas/canvasNodePresentationCopy.contract';
import { nodePropertyCopyEn } from './canvasNodePropertyCopy.en';
import { nodePropertyCopyEs } from './canvasNodePropertyCopy.es';
import type { CanvasViewCopy } from './canvasCopy.types';

export function buildCanvasNodePresentationCopy(
  copy: CanvasViewCopy,
  locale = 'en'
): CanvasNodePresentationCopy {
  const normalizedLocale = locale.trim().toLowerCase();
  const nodePropertyCopy = normalizedLocale.startsWith('es')
    ? nodePropertyCopyEs
    : nodePropertyCopyEn;

  return {
    columnsLabel: copy.nodePresentationColumnsLabel,
    declaredColumnsDetailTemplate: copy.nodePresentationDeclaredColumnsDetailTemplate,
    inheritedColumnsDetailTemplate: copy.nodePresentationInheritedColumnsDetailTemplate,
    mixedColumnsDetailTemplate: copy.nodePresentationMixedColumnsDetailTemplate,
    noColumnsDetail: copy.nodePresentationNoColumnsDetail,
    codeLabel: copy.nodePresentationCodeLabel,
    workspaceCodeDetailTemplate: copy.nodePresentationWorkspaceCodeDetailTemplate,
    generatedCodeDetailTemplate: copy.nodePresentationGeneratedCodeDetailTemplate,
    canonicalSubstraitCodeDetailTemplate: copy.nodePresentationCanonicalSubstraitCodeDetailTemplate,
    invalidCanonicalSubstraitCodeMessage: copy.nodePresentationInvalidCanonicalSubstraitCodeMessage,
    codeUnavailableMessage: copy.nodePresentationCodeUnavailableMessage,
    readyStatusLabel: copy.nodePresentationReadyStatusLabel,
    draftStatusLabel: copy.nodePresentationDraftStatusLabel,
    authoringTagLabel: copy.nodePresentationAuthoringTagLabel,
    locale,
    sectionLabels: nodePropertyCopy.sectionLabels,
    sectionEmptyStates: nodePropertyCopy.sectionEmptyStates,
    rowLabels: nodePropertyCopy.rowLabels,
    columnLabels: nodePropertyCopy.columnLabels,
    valueLabels: nodePropertyCopy.valueLabels,
    kindLabels: {
      'dvt:source': copy.nodePresentationSourceKindLabel,
      'dvt:transform': copy.nodePresentationModelKindLabel,
      'dbt:test': copy.nodePresentationTestKindLabel,
    },
  };
}
