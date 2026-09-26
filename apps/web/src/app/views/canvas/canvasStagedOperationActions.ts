/** Commands for the discardable staged-operation presentation model. */
import {
  connectCanvasStagedOperation,
  createCanvasStagedOperation,
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
    onConnected: (operation: CanvasStagedOperation) => void;
  }>
) {
  const remove = (id: string) => {
    args.setOperations((current) => current.filter((operation) => operation.id !== id));
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
      if (!args.editable || id === relationId) return;
      const operation = args.operations.find((candidate) => candidate.id === id);
      if (operation == null) return;
      const connected = connectCanvasStagedOperation(operation, port, relationId);
      if (connected === operation) return;
      args.setOperations((current) =>
        current.map((candidate) => (candidate.id === id ? connected : candidate))
      );
      args.setSelectedId(id);
      args.onConnected(connected);
    },
    remove,
    complete: remove,
  } as const;
}

export type CanvasStagedOperationActions = ReturnType<typeof createCanvasStagedOperationActions>;
