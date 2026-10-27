/** Commands for the discardable staged-operation presentation model. */
import {
  connectCanvasStagedOperation,
  createCanvasStagedOperation,
  disconnectCanvasStagedOperation,
  readCanvasStagedCompositionSignature,
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
import { invalidateCanvasOperationConsumers } from './canvasRetainedOperationConfiguration';

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
        const configured = current.map((operation) => {
          if (operation !== target) return operation;
          return args.configure?.(connected) ?? connected;
        });
        return invalidateCanvasOperationConsumers(configured, new Set([id]));
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
        return invalidateCanvasOperationConsumers(disconnected, new Set([id]));
      });
    },
    updateConfiguration: (
      id: string,
      update: Pick<CanvasStagedOperation, 'operation' | 'semanticDocument'> | 'reconfigure'
    ) => {
      if (!args.editable || !args.start()) return false;
      const target = args.operations.find((operation) => operation.id === id);
      if (target == null) return false;
      if (
        update === 'reconfigure' &&
        (target.configurationDocument == null ||
          target.semanticDocument != null ||
          readCanvasStagedCompositionSignature(target.operation).operator !== 'join')
      )
        return false;
      const candidate =
        update === 'reconfigure'
          ? args.configure?.({ id: target.id, operation: target.operation, inputs: target.inputs })
          : { ...target, ...update };
      if (candidate == null) return false;
      const document = decodeCanvasStagedOperation(candidate);
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
        if (current !== args.operations) return current;
        return current.map((operation) => {
          const projected = projectCanvasStagedDocument(document, operation.id);
          const { configurationDocument: _retained, ...configured } = operation;
          return projected == null
            ? operation
            : {
                ...configured,
                ...(operation.id === id ? { operation: candidate.operation } : {}),
                semanticDocument: encodeDvtSubstraitSemanticDocument(projected),
              };
        });
      });
      return true;
    },
  } as const;
}

export type CanvasStagedOperationActions = ReturnType<typeof createCanvasStagedOperationActions>;
