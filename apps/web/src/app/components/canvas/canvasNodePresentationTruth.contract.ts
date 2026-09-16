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
  description?: string;
  selected?: boolean;
  children?: readonly CanvasNodePresentationColumn[];
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

export type CanvasRelationalCompositionOperation = 'inner_join' | 'union_all';

export type CanvasRelationalCompositionTruth =
  | Readonly<{ state: 'single-input'; connectedInputCount: number }>
  | Readonly<{
      state: 'pending';
      connectedInputCount: number;
      pendingInputCount: number;
      canonicalOperation?: CanvasRelationalCompositionOperation;
    }>
  | Readonly<{
      state: 'canonical';
      connectedInputCount: number;
      operation: CanvasRelationalCompositionOperation;
    }>
  | Readonly<{
      state: 'incomplete';
      connectedInputCount: number;
      missingInputCount: number;
      canonicalOperation?: CanvasRelationalCompositionOperation;
    }>
  | Readonly<{
      state: 'unresolved';
      connectedInputCount: number;
      reason: 'input-identity-unavailable' | 'semantic-authority-invalid';
    }>;

export type CanvasNodePresentationTruth = Readonly<{
  columns: CanvasNodeColumnTruth;
  code: CanvasNodeCodeTruth;
  relationalComposition?: CanvasRelationalCompositionTruth;
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

  const relationalComposition = value.relationalComposition;
  const hasValidRelationalComposition =
    relationalComposition == null ||
    (isRecord(relationalComposition) &&
      typeof relationalComposition.connectedInputCount === 'number' &&
      (relationalComposition.state === 'single-input' ||
        relationalComposition.state === 'pending' ||
        relationalComposition.state === 'canonical' ||
        relationalComposition.state === 'incomplete' ||
        relationalComposition.state === 'unresolved'));

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
      value.code.kind === 'unavailable') &&
    hasValidRelationalComposition
  );
}
