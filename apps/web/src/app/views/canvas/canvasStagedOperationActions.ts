/** Commands for the discardable staged-operation presentation model. */
import {
  connectCanvasStagedOperation,
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
import { admitCanvasStagedConnection } from './canvasStagedConnectionAdmission';

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
    if (!args.editable) return;
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
      if (!args.editable) return;
      args.setOperations((current) => {
        const target = admitCanvasStagedConnection(args, current, id, port, relationId);
        if (target == null) return current;
        const connected = connectCanvasStagedOperation(target, port, relationId);
        if (connected === target) return current;
        return current.map((operation) => {
          if (operation !== target) return operation;
          return args.configure?.(connected) ?? connected;
        });
      });
      args.setSelectedId(id);
    },
    disconnect: (id: string, port: number) => {
      if (!args.editable) return;
      args.setOperations((current) => {
        const target = current.find((operation) => operation.id === id);
        if (target == null) return current;
        const detached = disconnectCanvasStagedOperation(target, port);
        if (detached === target) return current;
        const disconnected = current.map((operation) =>
          operation === target ? detached : operation
        );
        return invalidateConsumers(disconnected, new Set([id]));
      });
    },
    disconnectProducer: (relationId: string) => {
      if (!args.editable) return;
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
