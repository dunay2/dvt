/** Reopen the already analyzed canonical document, without reclassifying tree shapes. */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasRelationalTreeProjection } from './canvasRelationalTreeProjection';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { isCanvasSetOperation } from './canvasRelationalOperationChoices';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';

export type CanvasRelationalTreeExistingDraft = Readonly<{
  draft: SubstraitDocument;
  inputIds: readonly string[];
  operation: CanvasRelationalOperation;
}>;

export function resolveCanvasRelationalTreeExistingDraft(
  args: Readonly<{
    document: SubstraitDocument | null;
    projection: CanvasRelationalTreeProjection | null;
  }>
): CanvasRelationalTreeExistingDraft | null {
  if (args.projection == null || args.document == null) return null;
  let entry = args.projection.root;
  while (entry.children.length === 1) entry = entry.children[0]!.node;
  const operation = entry.operation ?? null;
  const inputIds = args.projection.inputs
    .filter((input) => input.state === 'participating')
    .map((input) => input.sourceNodeId);
  if (inputIds.some((nodeId) => nodeId == null)) return null;
  return {
    draft: args.document,
    operation:
      isCanvasJoinOperation(operation) ||
      isCanvasSetOperation(operation) ||
      operation === 'cross_join'
        ? operation
        : 'projection',
    // Ordered physical provenance for every occurrence; not a set of occurrence identities.
    inputIds: inputIds.filter((nodeId): nodeId is string => nodeId != null),
  };
}
