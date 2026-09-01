/** Owned concern: define and validate localized copy consumed by node presentation adapters. */
export type CanvasNodePresentationCopy = Readonly<{
  columnsLabel: string;
  declaredColumnsDetailTemplate: string;
  inheritedColumnsDetailTemplate: string;
  mixedColumnsDetailTemplate: string;
  noColumnsDetail: string;
  codeLabel: string;
  workspaceCodeDetailTemplate: string;
  generatedCodeDetailTemplate: string;
  canonicalSubstraitCodeDetailTemplate?: string;
  invalidCanonicalSubstraitCodeMessage?: string;
  codeUnavailableMessage: string;
  nodeActionsLabel?: string;
  readyStatusLabel?: string;
  draftStatusLabel?: string;
  authoringTagLabel?: string;
  kindLabels?: Readonly<Record<string, string>>;
  locale?: string;
  sectionLabels?: Readonly<Record<string, string>>;
  sectionEmptyStates?: Readonly<Record<string, string>>;
  rowLabels?: Readonly<Record<string, string>>;
  columnLabels?: Readonly<Record<string, string>>;
  valueLabels?: Readonly<Record<string, string>>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isCanvasNodePresentationCopy(value: unknown): value is CanvasNodePresentationCopy {
  return (
    isRecord(value) &&
    typeof value.columnsLabel === 'string' &&
    typeof value.declaredColumnsDetailTemplate === 'string' &&
    typeof value.inheritedColumnsDetailTemplate === 'string' &&
    typeof value.mixedColumnsDetailTemplate === 'string' &&
    typeof value.noColumnsDetail === 'string' &&
    typeof value.codeLabel === 'string' &&
    typeof value.workspaceCodeDetailTemplate === 'string' &&
    typeof value.generatedCodeDetailTemplate === 'string' &&
    (value.canonicalSubstraitCodeDetailTemplate == null ||
      typeof value.canonicalSubstraitCodeDetailTemplate === 'string') &&
    (value.invalidCanonicalSubstraitCodeMessage == null ||
      typeof value.invalidCanonicalSubstraitCodeMessage === 'string') &&
    typeof value.codeUnavailableMessage === 'string' &&
    (value.nodeActionsLabel == null || typeof value.nodeActionsLabel === 'string') &&
    (value.readyStatusLabel == null || typeof value.readyStatusLabel === 'string') &&
    (value.draftStatusLabel == null || typeof value.draftStatusLabel === 'string') &&
    (value.authoringTagLabel == null || typeof value.authoringTagLabel === 'string') &&
    (value.kindLabels == null || isRecord(value.kindLabels)) &&
    (value.locale == null || typeof value.locale === 'string') &&
    (value.sectionLabels == null || isRecord(value.sectionLabels)) &&
    (value.sectionEmptyStates == null || isRecord(value.sectionEmptyStates)) &&
    (value.rowLabels == null || isRecord(value.rowLabels)) &&
    (value.columnLabels == null || isRecord(value.columnLabels)) &&
    (value.valueLabels == null || isRecord(value.valueLabels))
  );
}
