/** Commands for the discardable staged-operation presentation model. */
import {
  connectCanvasStagedOperation,
  createsCanvasStagedOperationCycle,
  createCanvasStagedOperation,
  disconnectCanvasStagedOperation,
  type CanvasStagedOperation,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';
import {
  decodeCanvasStagedOperation,
  projectCanvasStagedDocument,
  resolveCanvasStagedEditingDocument,
} from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';

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
    consumedProducerIds: readonly string[];
    configure?: (operation: CanvasStagedOperation) => CanvasStagedOperation;
  }>
) {
  const remove = (id: string) => {
    args.setOperations((current) => {
      const detached = current
        .filter((operation) => operation.id !== id)
        .map((operation) =>
          operation.inputs.includes(id)
            ? withoutSemantic({
                ...operation,
                inputs: operation.inputs.map((input) => (input === id ? null : input)),
              })
            : operation
        );
      return invalidateConsumers(detached, new Set([id]));
    });
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
    clearSelection: () => args.setSelectedId(null),
    connect: (id: string, port: number, relationId: string) => {
      if (
        !args.editable ||
        id === relationId ||
        !args.producerIds.includes(relationId) ||
        args.consumedProducerIds.includes(relationId)
      )
        return;
      args.setOperations((current) => {
        if (
          current.some((operation) =>
            operation.inputs.some(
              (input, ordinal) => input === relationId && (operation.id !== id || ordinal !== port)
            )
          )
        )
          return current;
        if (createsCanvasStagedOperationCycle(current, relationId, id)) return current;
        return current.map((operation) => {
          if (
            operation.id !== id ||
            (operation.inputs[port] != null && operation.inputs[port] !== relationId)
          )
            return operation;
          const connected = connectCanvasStagedOperation(operation, port, relationId);
          return args.configure?.(connected) ?? connected;
        });
      });
      args.setSelectedId(id);
    },
    disconnect: (id: string, port: number) => {
      if (!args.editable) return;
      args.setOperations((current) => {
        const disconnected = current.map((operation) =>
          operation.id === id ? disconnectCanvasStagedOperation(operation, port) : operation
        );
        return invalidateConsumers(disconnected, new Set([id]));
      });
    },
    disconnectProducer: (relationId: string) => {
      args.setOperations((current) => {
        const invalidated = new Set<string>();
        const disconnected = current.map((operation) => {
          if (!operation.inputs.includes(relationId)) return operation;
          invalidated.add(operation.id);
          return withoutSemantic({
            ...operation,
            inputs: operation.inputs.map((input) => (input === relationId ? null : input)),
          });
        });
        return invalidateConsumers(disconnected, invalidated);
      });
    },
    updateConfiguration: (
      id: string,
      update: Pick<CanvasStagedOperation, 'operation' | 'semanticDocument'>
    ) => {
      if (!args.editable || !args.start()) return false;
      const target = args.operations.find((operation) => operation.id === id);
      if (target == null) return false;
      const document = decodeCanvasStagedOperation({ ...target, ...update });
      if (document == null) return false;
      const currentDocument = resolveCanvasStagedEditingDocument(target, args.operations);
      const currentIndex =
        currentDocument == null ? null : indexSubstraitRelations(currentDocument);
      if (
        currentIndex?.ok &&
        projectCanvasStagedDocument(document, currentIndex.index.rootId) == null
      )
        return false;
      args.setOperations((current) => {
        return current.map((operation) => {
          const projected = projectCanvasStagedDocument(document, operation.id);
          return projected == null
            ? operation
            : {
                ...operation,
                ...(operation.id === id ? { operation: update.operation } : {}),
                semanticDocument: encodeDvtSubstraitSemanticDocument(projected),
              };
        });
      });
      return true;
    },
    remove,
    complete: remove,
  } as const;
}

export type CanvasStagedOperationActions = ReturnType<typeof createCanvasStagedOperationActions>;

function withoutSemantic(operation: CanvasStagedOperation): CanvasStagedOperation {
  if (operation.semanticDocument == null) return operation;
  const { semanticDocument: _discarded, ...pending } = operation;
  return pending;
}

function invalidateConsumers(
  operations: readonly CanvasStagedOperation[],
  changedProducers: ReadonlySet<string>
): readonly CanvasStagedOperation[] {
  const invalidated = new Set(changedProducers);
  let changed = true;
  while (changed) {
    changed = false;
    operations.forEach((operation) => {
      if (
        !invalidated.has(operation.id) &&
        operation.inputs.some((input) => input != null && invalidated.has(input))
      ) {
        invalidated.add(operation.id);
        changed = true;
      }
    });
  }
  return operations.map((operation) =>
    changedProducers.has(operation.id)
      ? operation
      : invalidated.has(operation.id)
        ? withoutSemantic(operation)
        : operation
  );
}
