/** Discardable operation nodes with algebra-defined, freely connectable Input ports. */
import {
  allocateDvtRelationId,
  DVT_RELATIONAL_OPERATION_INPUTS,
  acceptsDvtRelationalOperationInputCount,
  type DvtSubstraitSemanticDocumentV1,
  type DvtRelationalOperationKind,
} from '@dvt/contracts';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeOperator } from './canvasRelationalTreeProjection';

export type CanvasStagedOperationKind = DvtRelationalOperationKind;
export type CanvasStagedConnectionIntent = 'relation' | 'field';
export type CanvasStagedConfigurationStrategy = 'manual' | 'transform' | 'composition';
export type CanvasStagedEditorKind = 'properties' | 'transform' | 'composition' | 'unary';
export type CanvasStagedCompositionState = 'unbound' | 'partially-bound' | 'ready' | 'configured';

export type CanvasStagedOperation = Readonly<{
  id: string;
  operation: CanvasStagedOperationKind;
  inputs: readonly (string | null)[];
  semanticDocument?: DvtSubstraitSemanticDocumentV1;
  configurationDocument?: DvtSubstraitSemanticDocumentV1;
}>;

type CanvasStagedCompositionInput = Readonly<{
  accepts: readonly CanvasStagedConnectionIntent[];
  requiresEmptyFor?: readonly CanvasStagedConnectionIntent[];
  requiresUnconfiguredFor?: readonly CanvasStagedConnectionIntent[];
}>;

export type CanvasStagedCompositionSignature = Readonly<{
  inputs: readonly CanvasStagedCompositionInput[];
  repeatedInput?: CanvasStagedCompositionInput;
  output: 'relation';
  operator: CanvasRelationalTreeOperator;
  appliedOperation: CanvasRelationalOperation | 'inherit';
  configuration: CanvasStagedConfigurationStrategy;
  editor: CanvasStagedEditorKind;
}>;

const relationInput: CanvasStagedCompositionInput = { accepts: ['relation'] };
const fieldSeededRelationInput: CanvasStagedCompositionInput = {
  accepts: ['relation', 'field'],
  requiresEmptyFor: ['field'],
  requiresUnconfiguredFor: ['field'],
};

type SignatureDefinition = Omit<CanvasStagedCompositionSignature, 'inputs' | 'repeatedInput'> & {
  input: CanvasStagedCompositionInput;
};

function unary(
  operator: CanvasRelationalTreeOperator,
  appliedOperation: CanvasRelationalOperation | 'inherit' = 'inherit',
  input: CanvasStagedCompositionInput = relationInput,
  configuration: CanvasStagedConfigurationStrategy = 'manual',
  editor: CanvasStagedEditorKind = 'unary'
): SignatureDefinition {
  return { input, output: 'relation', operator, appliedOperation, configuration, editor };
}

function composition(
  operator: CanvasRelationalTreeOperator,
  appliedOperation: CanvasRelationalOperation
): SignatureDefinition {
  return {
    input: relationInput,
    output: 'relation',
    operator,
    appliedOperation,
    configuration: 'composition',
    editor: 'composition',
  };
}

const definitions = {
  projection: unary('project', 'projection', relationInput, 'manual', 'properties'),
  field_transform: unary(
    'project',
    'projection',
    fieldSeededRelationInput,
    'transform',
    'transform'
  ),
  filter: unary('filter'),
  aggregate: unary('aggregate'),
  window: unary('window'),
  sort: unary('sort'),
  fetch: unary('fetch'),
  inner_join: composition('join', 'inner_join'),
  left_join: composition('join', 'left_join'),
  right_join: composition('join', 'right_join'),
  full_outer_join: composition('join', 'full_outer_join'),
  left_semi_join: composition('join', 'left_semi_join'),
  left_anti_join: composition('join', 'left_anti_join'),
  right_semi_join: composition('join', 'right_semi_join'),
  right_anti_join: composition('join', 'right_anti_join'),
  cross_join: composition('cross', 'cross_join'),
  union_all: composition('set', 'union_all'),
  union_distinct: composition('set', 'union_distinct'),
  intersect_distinct: composition('set', 'intersect_distinct'),
  except_distinct: composition('set', 'except_distinct'),
  intersect_all: composition('set', 'intersect_all'),
  except_all: composition('set', 'except_all'),
} as const satisfies Record<CanvasStagedOperationKind, SignatureDefinition>;

export const canvasStagedCompositionSignatures = Object.fromEntries(
  Object.entries(definitions).map(
    ([kind, { input, ...definition }]): [string, CanvasStagedCompositionSignature] => {
      const { minimum, maximum } =
        DVT_RELATIONAL_OPERATION_INPUTS[kind as CanvasStagedOperationKind];
      return [
        kind,
        {
          ...definition,
          inputs: Array.from({ length: minimum }, () => input),
          ...(maximum == null ? { repeatedInput: input } : {}),
        },
      ];
    }
  )
) as Record<CanvasStagedOperationKind, CanvasStagedCompositionSignature>;

export function readCanvasStagedCompositionSignature(
  operation: CanvasStagedOperationKind
): CanvasStagedCompositionSignature {
  return canvasStagedCompositionSignatures[operation];
}

export function isCanvasStagedOperationKind(value: string): value is CanvasStagedOperationKind {
  return Object.hasOwn(canvasStagedCompositionSignatures, value);
}

export function canvasStagedOperationCanAppend(
  operation: Pick<CanvasStagedOperation, 'operation' | 'inputs'>
): boolean {
  return (
    readCanvasStagedCompositionSignature(operation.operation).repeatedInput != null &&
    acceptsDvtRelationalOperationInputCount(operation.operation, operation.inputs.length) &&
    operation.inputs.every((input) => input != null)
  );
}

export function canvasStagedOperationAcceptsConnection(
  operation: CanvasStagedOperation,
  port: number,
  intent: CanvasStagedConnectionIntent
): boolean {
  if (!Number.isInteger(port) || port < 0) return false;
  if (
    port >= operation.inputs.length &&
    !(port === operation.inputs.length && canvasStagedOperationCanAppend(operation))
  )
    return false;
  const signature = readCanvasStagedCompositionSignature(operation.operation);
  const input = signature.inputs[port] ?? signature.repeatedInput;
  if (input == null || !input.accepts.includes(intent)) return false;
  if (input.requiresEmptyFor?.includes(intent) && operation.inputs[port] != null) return false;
  if (input.requiresUnconfiguredFor?.includes(intent) && operation.semanticDocument != null)
    return false;
  return true;
}

export function deriveCanvasStagedCompositionState(
  operation: CanvasStagedOperation
): CanvasStagedCompositionState {
  const connected = operation.inputs.filter((input) => input != null).length;
  if (connected === 0) return 'unbound';
  if (
    !acceptsDvtRelationalOperationInputCount(operation.operation, operation.inputs.length) ||
    connected < operation.inputs.length
  )
    return 'partially-bound';
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
    inputs: readCanvasStagedCompositionSignature(operation).inputs.map(() => null),
  };
}

export function connectCanvasStagedOperation(
  operation: CanvasStagedOperation,
  port: number,
  relationId: string
): CanvasStagedOperation {
  if (
    !canvasStagedOperationAcceptsConnection(operation, port, 'relation') ||
    relationId.trim().length === 0 ||
    operation.inputs[port] === relationId
  )
    return operation;
  const inputs = [...operation.inputs];
  inputs[port] = relationId;
  const { semanticDocument, ...pending } = operation;
  return {
    ...pending,
    inputs,
    ...(semanticDocument == null ? {} : { configurationDocument: semanticDocument }),
  };
}

export function disconnectCanvasStagedOperation(
  operation: CanvasStagedOperation,
  port: number
): CanvasStagedOperation {
  if (
    !Number.isInteger(port) ||
    port < 0 ||
    port >= operation.inputs.length ||
    operation.inputs[port] == null
  )
    return operation;
  const signature = readCanvasStagedCompositionSignature(operation.operation);
  const inputs = [...operation.inputs];
  if (signature.repeatedInput != null && inputs.length > signature.inputs.length)
    inputs.splice(port, 1);
  else inputs[port] = null;
  const { semanticDocument, ...pending } = operation;
  return {
    ...pending,
    inputs,
    ...(semanticDocument == null ? {} : { configurationDocument: semanticDocument }),
  };
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
