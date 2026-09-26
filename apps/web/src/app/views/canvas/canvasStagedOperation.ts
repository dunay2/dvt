/** Discardable operation placement before one typed connection admits semantic work. */
import { allocateDvtRelationId } from '@dvt/contracts';
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
    operation === 'fetch' ||
    operation === 'window'
  )
    return operation;
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
