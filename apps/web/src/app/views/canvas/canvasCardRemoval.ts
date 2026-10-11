/**
 * Owned concern: prepare deletion of one card without splicing or deleting its neighbours.
 * @baseline ADR-0064: canonical semantics and stable authoring identities remain authoritative.
 * @decision Reuse lossless graph projection and non-executable configuration retention.
 * @consequence Preparation is read-only; consumers survive with explicit missing inputs.
 * @version 1.0.0
 */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { projectCanvasCanonicalGraphEditing } from './canvasCanonicalGraphEditing';
import type { CanvasStagedOperation, CanvasStagedOperationKind } from './canvasStagedOperation';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import {
  invalidateCanvasOperationConfiguration,
  invalidateCanvasOperationConsumers,
} from './canvasRetainedOperationConfiguration';
import { CanvasCardRemovalError, CARD_REMOVAL_REJECTION } from './CanvasCardRemovalError';

export type CanvasCardRemovalGraph = Readonly<{
  sources: readonly PendingSourceOccurrence[];
  operations: readonly CanvasStagedOperation[];
  outputRelationId: string | null;
}>;
export type CanvasCardRemovalSnapshot = CanvasCardRemovalGraph &
  Readonly<{
    document: SubstraitDocument | null;
    inputIds: readonly string[];
  }>;
export type CanvasRemovalCard = Readonly<{
  id: string;
  operation: CanvasStagedOperationKind | 'read';
  displayName: string | null;
}>;
export type CanvasCardRemovalProposal = Readonly<{
  snapshot: CanvasCardRemovalSnapshot;
  target: CanvasRemovalCard;
  dependents: readonly CanvasRemovalCard[];
  affectedIds: readonly string[];
  disconnectsOutput: boolean;
  graph: CanvasCardRemovalGraph;
}>;

export function removeCanvasStagedProducer(
  operations: readonly CanvasStagedOperation[],
  id: string
): readonly CanvasStagedOperation[] {
  return invalidateCanvasOperationConsumers(operations, new Set([id]))
    .filter((operation) => operation.id !== id)
    .map((operation) =>
      operation.inputs.includes(id)
        ? invalidateCanvasOperationConfiguration({
            ...operation,
            inputs: operation.inputs.map((input) => (input === id ? null : input)),
          })
        : operation
    );
}

export function prepareCanvasCardRemoval(
  snapshot: CanvasCardRemovalSnapshot,
  id: string
): CanvasCardRemovalProposal {
  const canonical =
    snapshot.document == null
      ? { sources: [], operations: [] }
      : projectCanvasCanonicalGraphEditing(snapshot.document, snapshot.inputIds);
  if (canonical == null) throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.unavailable);
  const sources = [...canonical.sources, ...snapshot.sources];
  const operations = [...canonical.operations, ...snapshot.operations];
  const source = sources.find((entry) => entry.read.binding.relationId === id);
  const operation = operations.find((entry) => entry.id === id);
  if (source == null && operation == null)
    throw new CanvasCardRemovalError(CARD_REMOVAL_REJECTION.unavailable);
  const target: CanvasRemovalCard = {
    id,
    operation: operation?.operation ?? 'read',
    displayName: source?.read.binding.displayName ?? null,
  };
  const next = removeCanvasStagedProducer(operations, id);
  const previous = new Map(operations.map((entry) => [entry.id, entry]));
  return {
    snapshot,
    target,
    dependents: operations
      .filter((entry) => entry.inputs.includes(id))
      .map((entry) => ({
        id: entry.id,
        operation: entry.operation,
        displayName: null,
      })),
    affectedIds: [
      id,
      ...next.filter((entry) => entry !== previous.get(entry.id)).map((entry) => entry.id),
    ],
    disconnectsOutput: snapshot.outputRelationId === id,
    graph: {
      sources: sources.filter((entry) => entry.read.binding.relationId !== id),
      operations: next,
      outputRelationId: snapshot.outputRelationId === id ? null : snapshot.outputRelationId,
    },
  };
}
