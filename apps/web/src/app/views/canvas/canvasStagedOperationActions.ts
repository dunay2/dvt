/** Commands for the discardable staged-operation presentation model. */
import {
  connectCanvasStagedOperation,
  createsCanvasStagedOperationCycle,
  createCanvasStagedOperation,
  disconnectCanvasStagedOperation,
  type CanvasStagedOperation,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';

export function createCanvasStagedOperationActions(
  args: Readonly<{
    editable: boolean;
    start: () => boolean;
    operations: readonly CanvasStagedOperation[];
    setOperations: (
      update: (current: readonly CanvasStagedOperation[]) => readonly CanvasStagedOperation[]
    ) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    producerIds: readonly string[];
  }>
) {
  const remove = (id: string) => {
    args.setOperations((current) =>
      current
        .filter((operation) => operation.id !== id)
        .map((operation) => ({
          ...operation,
          inputs: operation.inputs.map((input) => (input === id ? null : input)),
        }))
    );
    if (args.selectedId === id) args.setSelectedId(null);
  };
  return {
    operations: args.operations,
    selectedId: args.selectedId,
    stage: (operation: CanvasStagedOperationKind): string | null => {
      if (!args.editable || !args.start()) return null;
      const staged = createCanvasStagedOperation(operation);
      args.setOperations((current) => [...current, staged]);
      args.setSelectedId(staged.id);
      return staged.id;
    },
    select: (id: string) => {
      if (!args.operations.some((operation) => operation.id === id)) return;
      args.setSelectedId(id);
    },
    connect: (id: string, port: number, relationId: string) => {
      if (!args.editable || id === relationId || !args.producerIds.includes(relationId)) return;
      args.setOperations((current) => {
        if (createsCanvasStagedOperationCycle(current, relationId, id)) return current;
        return current.map((operation) => {
          if (
            operation.id !== id ||
            (operation.inputs[port] != null && operation.inputs[port] !== relationId)
          )
            return operation;
          return connectCanvasStagedOperation(operation, port, relationId);
        });
      });
      args.setSelectedId(id);
    },
    disconnect: (id: string, port: number) => {
      if (!args.editable) return;
      args.setOperations((current) =>
        current.map((operation) =>
          operation.id === id ? disconnectCanvasStagedOperation(operation, port) : operation
        )
      );
    },
    disconnectProducer: (relationId: string) => {
      args.setOperations((current) =>
        current.map((operation) => ({
          ...operation,
          inputs: operation.inputs.map((input) => (input === relationId ? null : input)),
        }))
      );
    },
    remove,
    complete: remove,
  } as const;
}

export type CanvasStagedOperationActions = ReturnType<typeof createCanvasStagedOperationActions>;
