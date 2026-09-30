/** Discardable operation nodes with algebra-defined, freely connectable Input ports. */
import {
  allocateDvtRelationId,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { buildCanvasRelationalTreeRelation } from './canvasRelationalTreeRelationProjection';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type {
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';

export type CanvasStagedOperationKind =
  CanvasRelationalOperation | CanvasRelationalOperatorTool['id'] | 'field_transform';
export type CanvasStagedConnectionIntent = 'relation' | 'field';
export type CanvasStagedCompositionState =
  | 'unbound'
  | 'partially-bound'
  | 'ready'
  | 'configured';

export type CanvasStagedOperation = Readonly<{
  id: string;
  operation: CanvasStagedOperationKind;
  inputs: readonly (string | null)[];
  semanticDocument?: DvtSubstraitSemanticDocumentV1;
}>;

type CanvasStagedCompositionInput = Readonly<{
  accepts: readonly CanvasStagedConnectionIntent[];
  requiresEmptyFor?: readonly CanvasStagedConnectionIntent[];
  requiresUnconfiguredFor?: readonly CanvasStagedConnectionIntent[];
}>;

export type CanvasStagedCompositionSignature = Readonly<{
  inputs:
    | readonly [CanvasStagedCompositionInput]
    | readonly [CanvasStagedCompositionInput, CanvasStagedCompositionInput];
  output: 'relation';
  operator: CanvasRelationalTreeOperator;
  appliedOperation: CanvasRelationalOperation | 'inherit';
}>;

const relationInput: CanvasStagedCompositionInput = { accepts: ['relation'] };
const fieldSeededRelationInput: CanvasStagedCompositionInput = {
  accepts: ['relation', 'field'],
  requiresEmptyFor: ['field'],
  requiresUnconfiguredFor: ['field'],
};

function unary(
  operator: CanvasRelationalTreeOperator,
  appliedOperation: CanvasRelationalOperation | 'inherit' = 'inherit',
  input: CanvasStagedCompositionInput = relationInput
): CanvasStagedCompositionSignature {
  return { inputs: [input], output: 'relation', operator, appliedOperation };
}

function binary(
  operator: CanvasRelationalTreeOperator,
  appliedOperation: CanvasRelationalOperation
): CanvasStagedCompositionSignature {
  return {
    inputs: [relationInput, relationInput],
    output: 'relation',
    operator,
    appliedOperation,
  };
}

const compositionSignatures = {
  projection: unary('project', 'projection'),
  field_transform: unary('project', 'projection', fieldSeededRelationInput),
  filter: unary('filter'),
  aggregate: unary('aggregate'),
  window: unary('window'),
  sort: unary('sort'),
  fetch: unary('fetch'),
  inner_join: binary('join', 'inner_join'),
  left_join: binary('join', 'left_join'),
  right_join: binary('join', 'right_join'),
  full_outer_join: binary('join', 'full_outer_join'),
  left_semi_join: binary('join', 'left_semi_join'),
  left_anti_join: binary('join', 'left_anti_join'),
  right_semi_join: binary('join', 'right_semi_join'),
  right_anti_join: binary('join', 'right_anti_join'),
  cross_join: binary('cross', 'cross_join'),
  union_all: binary('set', 'union_all'),
  union_distinct: binary('set', 'union_distinct'),
  intersect_distinct: binary('set', 'intersect_distinct'),
  except_distinct: binary('set', 'except_distinct'),
  intersect_all: binary('set', 'intersect_all'),
  except_all: binary('set', 'except_all'),
} satisfies Record<CanvasStagedOperationKind, CanvasStagedCompositionSignature>;

export function readCanvasStagedCompositionSignature(
  operation: CanvasStagedOperationKind
): CanvasStagedCompositionSignature {
  return compositionSignatures[operation];
}

export function isCanvasStagedOperationKind(value: string): value is CanvasStagedOperationKind {
  return Object.hasOwn(compositionSignatures, value);
}

export function canvasStagedOperationArity(operation: CanvasStagedOperationKind): 1 | 2 {
  return readCanvasStagedCompositionSignature(operation).inputs.length;
}

export function canvasStagedOperationAcceptsConnection(
  operation: CanvasStagedOperation,
  port: number,
  intent: CanvasStagedConnectionIntent
): boolean {
  if (!Number.isInteger(port) || port < 0) return false;
  const input = readCanvasStagedCompositionSignature(operation.operation).inputs[port];
  if (input == null || !input.accepts.includes(intent)) return false;
  if (input.requiresEmptyFor?.includes(intent) && operation.inputs[port] != null) return false;
  if (input.requiresUnconfiguredFor?.includes(intent) && operation.semanticDocument != null)
    return false;
  return true;
}

export function deriveCanvasStagedCompositionState(
  operation: CanvasStagedOperation
): CanvasStagedCompositionState {
  const arity = canvasStagedOperationArity(operation.operation);
  const connected = operation.inputs.slice(0, arity).filter((input) => input != null).length;
  if (connected === 0) return 'unbound';
  if (connected < arity) return 'partially-bound';
  return operation.semanticDocument == null ? 'ready' : 'configured';
}

export function canvasStagedOperationAppliedOperation(
  operation: CanvasStagedOperationKind,
  fallback: CanvasRelationalOperation | null
): CanvasRelationalOperation {
  const applied = readCanvasStagedCompositionSignature(operation).appliedOperation;
  return applied === 'inherit' ? (fallback ?? 'projection') : applied;
}

export function createCanvasStagedOperation(
  operation: CanvasStagedOperationKind
): CanvasStagedOperation {
  return {
    id: `pending-operation:${allocateDvtRelationId()}`,
    operation,
    inputs: Array.from({ length: canvasStagedOperationArity(operation) }, () => null),
  };
}

export function connectCanvasStagedOperation(
  operation: CanvasStagedOperation,
  port: number,
  relationId: string
): CanvasStagedOperation {
  if (port < 0 || port >= operation.inputs.length || relationId.trim().length === 0)
    return operation;
  const inputs = [...operation.inputs];
  inputs[port] = relationId;
  return { ...operation, inputs };
}

export function disconnectCanvasStagedOperation(
  operation: CanvasStagedOperation,
  port: number
): CanvasStagedOperation {
  if (port < 0 || port >= operation.inputs.length || operation.inputs[port] == null)
    return operation;
  const inputs = [...operation.inputs];
  inputs[port] = null;
  const { semanticDocument: _discarded, ...pending } = operation;
  return { ...pending, inputs };
}

export function createsCanvasStagedOperationCycle(
  operations: readonly CanvasStagedOperation[],
  producerId: string,
  consumerId: string
): boolean {
  const byId = new Map(operations.map((operation) => [operation.id, operation]));
  const visited = new Set<string>();
  const dependsOn = (id: string): boolean => {
    if (id === consumerId) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return byId.get(id)?.inputs.some((input) => input != null && dependsOn(input)) ?? false;
  };
  return dependsOn(producerId);
}

export function projectCanvasStagedOperation(
  staged: CanvasStagedOperation
): CanvasRelationalTreeNode {
  const document = decodeCanvasStagedOperation(staged);
  const indexed = document == null ? null : indexSubstraitRelations(document);
  if (indexed?.ok && indexed.index.rootId === staged.id) {
    const root = buildCanvasRelationalTreeRelation({ index: indexed.index, digest: staged.id });
    return { ...root, locator: staged.id, operation: staged.operation };
  }
  return {
    locator: staged.id,
    operator: readCanvasStagedCompositionSignature(staged.operation).operator,
    substraitKind: 'pending',
    operation: staged.operation,
    relationId: staged.id,
    displayName: null,
    sourceRef: null,
    output: { fields: [] },
    expressionRefs: [],
    decorations: [],
    children: [],
  };
}
