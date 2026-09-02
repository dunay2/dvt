/** Owned concern: define the provenance-preserving presentation DTO shared by Canvas consumers. */
export type CanvasNodePresentationColumnProvenance = 'declared' | 'inherited';

export type CanvasNodePresentationColumn = Readonly<{
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  provenance: CanvasNodePresentationColumnProvenance;
  sourceNodeId?: string;
  sourceNodeName?: string;
  sourceFieldName?: string;
  sourceReference?: string;
  reference?: string;
  operations?: readonly string[];
  selected?: boolean;
}>;

export type CanvasNodeColumnTruth = Readonly<{
  declared: readonly CanvasNodePresentationColumn[];
  inherited: readonly CanvasNodePresentationColumn[];
  visible: readonly CanvasNodePresentationColumn[];
  declaredCount: number;
  inheritedCount: number;
  visibleCount: number;
  visibleProvenance: CanvasNodePresentationColumnProvenance | 'mixed' | 'none';
}>;

export type CanvasNodeCodeLanguage = 'sql' | 'yaml' | 'json' | 'text';

export type CanvasNodeCodeUnavailableReason = 'invalid-canonical-substrait-document';

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
      kind: 'generated';
      content: string;
      path: string;
      language: CanvasNodeCodeLanguage;
    }>
  | Readonly<{
      kind: 'canonical';
      content: string;
      language: 'json';
      schemaVersion: string;
      digest: string;
    }>
  | Readonly<{
      kind: 'unavailable';
      reason?: CanvasNodeCodeUnavailableReason;
    }>;

export type CanvasNodePresentationTruth = Readonly<{
  columns: CanvasNodeColumnTruth;
  code: CanvasNodeCodeTruth;
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
      value.columns.visibleProvenance === 'mixed' ||
      value.columns.visibleProvenance === 'none') &&
    (value.code.kind === 'inline' ||
      value.code.kind === 'workspace-file' ||
      value.code.kind === 'generated' ||
      value.code.kind === 'canonical' ||
      value.code.kind === 'unavailable')
  );
}
