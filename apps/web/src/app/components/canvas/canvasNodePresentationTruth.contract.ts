/**
 * Owned concern: define the provenance-preserving presentation DTO shared by Canvas consumers.
 * @baseline ADR-0044: diagnostic prose is not a semantic contract.
 * @baseline ADR-0064: cards project canonical semantics without a parallel semantic model.
 * @decision GH-3628 read-model ownership supplies posture; validate its structural consistency.
 * @consequence Legacy Source/DBT truth remains valid; posture never grants command authorization.
 * @version 1.1.0
 */
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
  sources?: readonly Readonly<{
    nodeId: string;
    fieldId: string;
    name: string;
    nodeName: string;
  }>[];
}>;

export type CanvasNodeColumnTruth = Readonly<{
  state?: 'ready' | 'pending' | 'unavailable' | 'unconfigured';
  diagnostic?: string;
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

export type CanvasRelationalCompositionOperation =
  | 'inner_join'
  | 'left_join'
  | 'right_join'
  | 'full_outer_join'
  | 'left_semi_join'
  | 'left_anti_join'
  | 'right_semi_join'
  | 'right_anti_join'
  | 'cross_join'
  | 'union_all'
  | 'union_distinct'
  | 'intersect_distinct'
  | 'except_distinct'
  | 'intersect_all'
  | 'except_all';

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

export type CanvasInputBindingPosture = 'current' | 'repair-only' | 'unavailable';

export type CanvasNodePresentationTruth = Readonly<{
  inputBindingPosture?: CanvasInputBindingPosture;
  inputBindings?: readonly CanvasInputBindingPresentation[];
  columns: CanvasNodeColumnTruth;
  code: CanvasNodeCodeTruth;
  relationalComposition?: CanvasRelationalCompositionTruth;
  filterSummary?: string;
}>;

export type CanvasInputBindingPresentation = Readonly<{
  inputId: string;
  source: Readonly<{ nodeId: string; columnId: string }>;
  name: string;
  type: string;
  state: 'available' | 'unresolved';
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInputBindingPresentation(value: unknown): value is CanvasInputBindingPresentation {
  if (!isRecord(value) || !isRecord(value.source)) return false;
  const fields = [
    value.inputId,
    value.name,
    value.type,
    value.source.nodeId,
    value.source.columnId,
  ];
  return (
    fields.every((field) => typeof field === 'string' && field.trim().length > 0) &&
    (value.state === 'available' || value.state === 'unresolved')
  );
}

function isInputBindings(value: unknown): value is readonly CanvasInputBindingPresentation[] {
  if (!Array.isArray(value)) return false;
  for (const input of value) {
    if (!isInputBindingPresentation(input)) return false;
  }
  return true;
}

function hasConsistentInputBindingPosture(
  value: Record<string, unknown>,
  columns: Record<string, unknown>
): boolean {
  if (value.inputBindingPosture === undefined) return true;
  const inputBindings = value.inputBindings;
  if (inputBindings !== undefined && !isInputBindings(inputBindings)) return false;

  switch (value.inputBindingPosture) {
    case 'current':
      return columns.state === 'ready' || columns.state === 'unconfigured';
    case 'unavailable':
      return columns.state === 'pending' || columns.state === 'unavailable';
    case 'repair-only':
      return (
        columns.state === 'unavailable' &&
        isRecord(value.relationalComposition) &&
        value.relationalComposition.state === 'incomplete' &&
        inputBindings !== undefined &&
        inputBindings.some((input) => input.state === 'unresolved')
      );
    default:
      return false;
  }
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
    (value.filterSummary == null || typeof value.filterSummary === 'string') &&
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
    hasValidRelationalComposition &&
    hasConsistentInputBindingPosture(value, value.columns)
  );
}
