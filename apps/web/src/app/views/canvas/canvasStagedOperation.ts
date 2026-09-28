/** Discardable operation nodes with algebra-defined, freely connectable Input ports. */
import { allocateDvtRelationId } from '@dvt/contracts';
import type { DvtSubstraitSemanticDocumentV1 } from '@dvt/contracts';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type {
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';

export type CanvasStagedOperationKind =
  CanvasRelationalOperation | CanvasRelationalOperatorTool['id'] | 'field_transform';

export type CanvasStagedOperation = Readonly<{
  id: string;
  operation: CanvasStagedOperationKind;
  inputs: readonly (string | null)[];
  semanticDocument?: DvtSubstraitSemanticDocumentV1;
}>;

const binary = new Set<CanvasStagedOperationKind>([
  'inner_join',
  'left_join',
  'right_join',
  'full_outer_join',
  'left_semi_join',
  'left_anti_join',
  'right_semi_join',
  'right_anti_join',
  'cross_join',
  'union_all',
  'union_distinct',
  'intersect_distinct',
  'except_distinct',
  'intersect_all',
  'except_all',
]);

const operations = new Set<CanvasStagedOperationKind>([
  'projection',
  'field_transform',
  'filter',
  'aggregate',
  'window',
  'sort',
  'fetch',
  ...binary,
]);

export function isCanvasStagedOperationKind(value: string): value is CanvasStagedOperationKind {
  return operations.has(value as CanvasStagedOperationKind);
}

export function canvasStagedOperationArity(operation: CanvasStagedOperationKind): 1 | 2 {
  return binary.has(operation) ? 2 : 1;
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

function operatorFor(operation: CanvasStagedOperationKind): CanvasRelationalTreeOperator {
  if (operation === 'projection' || operation === 'field_transform') return 'project';
  if (operation === 'cross_join') return 'cross';
  if (operation.includes('join')) return 'join';
  if (
    operation.startsWith('union') ||
    operation.startsWith('intersect') ||
    operation.startsWith('except')
  )
    return 'set';
  if (
    operation === 'filter' ||
    operation === 'aggregate' ||
    operation === 'sort' ||
    operation === 'fetch'
  )
    return operation;
  if (operation === 'window') return 'window';
  return 'unsupported';
}

export function projectCanvasStagedOperation(
  staged: CanvasStagedOperation
): CanvasRelationalTreeNode {
  return {
    locator: staged.id,
    operator: operatorFor(staged.operation),
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
