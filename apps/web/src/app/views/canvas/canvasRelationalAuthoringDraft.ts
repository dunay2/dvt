/** Adapt the persisted incomplete-authoring DTO without making it semantic authority. */
import {
  DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY,
  DvtRelationalAuthoringDraftV1Schema,
  type DvtRelationalAuthoringDraftV1,
} from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CardPosition } from './canvasRelationalTreeGeometry';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { restorePendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';

export function readCanvasRelationalAuthoringDraft(
  node: CanonicalNode
): DvtRelationalAuthoringDraftV1 | null {
  const value = node.metadata?.[DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY];
  if (value == null) return null;
  const parsed = DvtRelationalAuthoringDraftV1Schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createCanvasRelationalAuthoringDraft(
  args: Readonly<{
    sources: readonly PendingSourceOccurrence[];
    operations: readonly CanvasStagedOperation[];
    outputRelationId: string | null;
    positions: ReadonlyMap<string, CardPosition>;
  }>
): DvtRelationalAuthoringDraftV1 {
  const nodeIds = new Set([
    ...args.sources.map((source) => source.read.binding.relationId),
    ...args.operations.map((operation) => operation.id),
  ]);
  return DvtRelationalAuthoringDraftV1Schema.parse({
    version: 'v1',
    sources: args.sources.map((source) => ({
      relationId: source.read.binding.relationId,
      sourceNodeId: source.sourceNodeId,
      displayName: source.read.binding.displayName,
      fieldIds: source.read.fields.map((field) => field.fieldId),
    })),
    operations: args.operations.map((operation) => ({
      relationId: operation.id,
      operation: operation.operation,
      inputs: operation.inputs,
    })),
    outputRelationId: args.outputRelationId,
    positions: Object.fromEntries([...args.positions].filter(([id]) => nodeIds.has(id))),
  });
}

export function restoreCanvasRelationalAuthoringDraft(
  draft: DvtRelationalAuthoringDraftV1,
  inputs: readonly CanvasDvtCompositionInput[]
): Readonly<{
  sources: readonly PendingSourceOccurrence[];
  operations: readonly CanvasStagedOperation[];
  outputRelationId: string | null;
  positions: ReadonlyMap<string, CardPosition>;
}> | null {
  const sources = draft.sources.map((source) => {
    const input = inputs.find((candidate) => candidate.nodeId === source.sourceNodeId);
    return input == null ? null : restorePendingSourceOccurrence(input, source);
  });
  if (sources.some((source) => source == null)) return null;
  return {
    sources: sources.filter((source): source is PendingSourceOccurrence => source != null),
    operations: draft.operations.map((operation) => ({
      id: operation.relationId,
      operation: operation.operation,
      inputs: operation.inputs,
    })),
    outputRelationId: draft.outputRelationId,
    positions: new Map(Object.entries(draft.positions)),
  };
}
