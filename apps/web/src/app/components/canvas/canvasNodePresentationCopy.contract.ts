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
  readyStatusLabel?: string;
  draftStatusLabel?: string;
  authoringTagLabel?: string;
  kindLabels?: Readonly<Record<string, string>>;
  locale?: string;
  sectionLabels?: Readonly<Record<string, string>>;
  sectionEmptyStates?: Readonly<Record<string, string>>;
  sourceOutputs?: Readonly<{ label: string; emptyState: string }>;
  rowLabels?: Readonly<Record<string, string>>;
  columnLabels?: Readonly<Record<string, string>>;
  valueLabels?: Readonly<Record<string, string>>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isCanvasNodePresentationCopy(value: unknown): value is CanvasNodePresentationCopy {
  if (!isRecord(value)) return false;
  return (
    REQUIRED_COPY_STRINGS.every((key) => typeof value[key] === 'string') &&
    OPTIONAL_COPY_STRINGS.every((key) =>
      isOptionalCopyValue(value[key], (entry) => typeof entry === 'string')
    ) &&
    OPTIONAL_COPY_RECORDS.every((key) => isOptionalCopyValue(value[key], isRecord)) &&
    isOptionalCopyValue(value.sourceOutputs, isSourceOutputsCopy)
  );
}

const REQUIRED_COPY_STRINGS = [
  'columnsLabel',
  'declaredColumnsDetailTemplate',
  'inheritedColumnsDetailTemplate',
  'mixedColumnsDetailTemplate',
  'noColumnsDetail',
  'codeLabel',
  'workspaceCodeDetailTemplate',
  'generatedCodeDetailTemplate',
  'codeUnavailableMessage',
] as const;

const OPTIONAL_COPY_STRINGS = [
  'canonicalSubstraitCodeDetailTemplate',
  'invalidCanonicalSubstraitCodeMessage',
  'readyStatusLabel',
  'draftStatusLabel',
  'authoringTagLabel',
  'locale',
] as const;

const OPTIONAL_COPY_RECORDS = [
  'kindLabels',
  'sectionLabels',
  'sectionEmptyStates',
  'rowLabels',
  'columnLabels',
  'valueLabels',
] as const;

function isOptionalCopyValue(value: unknown, validate: (entry: unknown) => boolean): boolean {
  return value == null || validate(value);
}

function isSourceOutputsCopy(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.label === 'string' && typeof value.emptyState === 'string';
}
