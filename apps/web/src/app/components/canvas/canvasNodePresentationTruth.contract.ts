/** Owned concern: define the provenance-preserving presentation DTO shared by Canvas consumers. */
export type CanvasNodePresentationColumnProvenance = 'declared' | 'inherited';

export type CanvasNodePresentationColumn = Readonly<{
  name: string;
  type: string;
  nullable?: boolean;
  provenance: CanvasNodePresentationColumnProvenance;
  sourceNodeId?: string;
  sourceNodeName?: string;
  reference?: string;
  selected?: boolean;
}>;

export type CanvasNodeColumnTruth = Readonly<{
  declared: readonly CanvasNodePresentationColumn[];
  inherited: readonly CanvasNodePresentationColumn[];
  visible: readonly CanvasNodePresentationColumn[];
  declaredCount: number;
  inheritedCount: number;
  visibleCount: number;
  visibleProvenance: CanvasNodePresentationColumnProvenance | 'none';
}>;

export type CanvasNodeCodeLanguage = 'sql' | 'yaml' | 'json' | 'text';

export type CanvasNodeCodeTruth =
  | Readonly<{
      kind: 'inline';
      content: string;
      language: CanvasNodeCodeLanguage;
      path?: string;
    }>
  | Readonly<{
      kind: 'workspace-file';
      path: string;
      language: CanvasNodeCodeLanguage;
    }>
  | Readonly<{
      kind: 'unavailable';
    }>;

export type CanvasNodePresentationTruth = Readonly<{
  columns: CanvasNodeColumnTruth;
  code: CanvasNodeCodeTruth;
}>;

export type CanvasNodePresentationCopy = Readonly<{
  columnsLabel: string;
  declaredColumnsDetailTemplate: string;
  inheritedColumnsDetailTemplate: string;
  noColumnsDetail: string;
  codeLabel: string;
  workspaceCodeDetailTemplate: string;
  codeUnavailableMessage: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isCanvasNodePresentationTruth(
  value: unknown
): value is CanvasNodePresentationTruth {
  if (!isRecord(value) || !isRecord(value.columns) || !isRecord(value.code)) {
    return false;
  }

  return (
    typeof value.columns.visibleCount === 'number' &&
    (value.columns.visibleProvenance === 'declared' ||
      value.columns.visibleProvenance === 'inherited' ||
      value.columns.visibleProvenance === 'none') &&
    (value.code.kind === 'inline' ||
      value.code.kind === 'workspace-file' ||
      value.code.kind === 'unavailable')
  );
}

export function isCanvasNodePresentationCopy(value: unknown): value is CanvasNodePresentationCopy {
  return (
    isRecord(value) &&
    typeof value.columnsLabel === 'string' &&
    typeof value.declaredColumnsDetailTemplate === 'string' &&
    typeof value.inheritedColumnsDetailTemplate === 'string' &&
    typeof value.noColumnsDetail === 'string' &&
    typeof value.codeLabel === 'string' &&
    typeof value.workspaceCodeDetailTemplate === 'string' &&
    typeof value.codeUnavailableMessage === 'string'
  );
}
