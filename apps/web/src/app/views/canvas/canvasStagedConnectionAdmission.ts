/** Shared graph admission for relation and field-driven connections. */
import {
  canvasStagedOperationAcceptsConnection,
  createsCanvasStagedOperationCycle,
  type CanvasStagedConnectionIntent,
  type CanvasStagedOperation,
} from './canvasStagedOperation';

export type CanvasStagedConnectionScope = Readonly<{
  editable: boolean;
  producerIds: readonly string[];
  consumedProducerIds: readonly string[];
}>;

export function admitCanvasStagedConnection(
  scope: CanvasStagedConnectionScope,
  operations: readonly CanvasStagedOperation[],
  id: string,
  port: number,
  relationId: string,
  intent: CanvasStagedConnectionIntent = 'relation'
): CanvasStagedOperation | null {
  const target = operations.find((operation) => operation.id === id);
  if (
    !scope.editable ||
    target == null ||
    id === relationId ||
    !Number.isInteger(port) ||
    port < 0 ||
    !canvasStagedOperationAcceptsConnection(target, port, intent) ||
    !scope.producerIds.includes(relationId) ||
    scope.consumedProducerIds.includes(relationId) ||
    (target.inputs[port] != null && target.inputs[port] !== relationId) ||
    operations.some((operation) =>
      operation.inputs.some(
        (input, ordinal) => input === relationId && (operation.id !== id || ordinal !== port)
      )
    ) ||
    createsCanvasStagedOperationCycle(operations, relationId, id)
  )
    return null;
  return target;
}
