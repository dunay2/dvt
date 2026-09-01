/** Owned concern: merge active Transform outputs with inactive source fields without visual jumps. */
import type { CanvasNodePresentationColumn } from '../../components/canvas/canvasNodePresentationTruth.contract';

type PresentedOutput = Readonly<{
  name: string;
  sourceNodeId?: string;
  sourceFieldName?: string;
}>;

type OrderedColumn = Readonly<{
  column: CanvasNodePresentationColumn;
  sourceOrdinal: number | null;
}>;

function sourceKey(nodeId: string | undefined, fieldName: string | undefined): string | null {
  return nodeId == null || fieldName == null ? null : `${nodeId}\u0000${fieldName}`;
}

export function projectTransformColumnsInStableOrder(args: {
  declared: readonly CanvasNodePresentationColumn[];
  inherited: readonly CanvasNodePresentationColumn[];
  outputs: readonly PresentedOutput[];
}): CanvasNodePresentationColumn[] {
  const inheritedOrdinalBySource = new Map(
    args.inherited.flatMap((column, ordinal) => {
      const key = sourceKey(column.sourceNodeId, column.name);
      return key == null ? [] : [[key, ordinal] as const];
    })
  );
  const projectedSourceKeys = new Set(
    args.outputs.flatMap((output) => {
      const key = sourceKey(output.sourceNodeId, output.sourceFieldName);
      return key == null ? [] : [key];
    })
  );
  const declaredNames = new Set(args.declared.map((column) => column.name));
  const ordered: OrderedColumn[] = args.declared.map((column, outputOrdinal) => {
    const output = args.outputs[outputOrdinal];
    const key = sourceKey(output?.sourceNodeId, output?.sourceFieldName);
    return {
      column,
      sourceOrdinal: key == null ? null : (inheritedOrdinalBySource.get(key) ?? null),
    };
  });
  const inactive = args.inherited.filter((column) => {
    const key = sourceKey(column.sourceNodeId, column.name);
    return !declaredNames.has(column.name) && (key == null || !projectedSourceKeys.has(key));
  });

  for (const column of inactive) {
    const sourceOrdinal = args.inherited.indexOf(column);
    let precedingIndex = -1;
    let precedingOrdinal = -1;
    let followingIndex = -1;
    let followingOrdinal = Number.POSITIVE_INFINITY;

    ordered.forEach((candidate, index) => {
      if (candidate.sourceOrdinal == null) return;
      if (candidate.sourceOrdinal < sourceOrdinal && candidate.sourceOrdinal > precedingOrdinal) {
        precedingOrdinal = candidate.sourceOrdinal;
        precedingIndex = index;
      }
      if (candidate.sourceOrdinal > sourceOrdinal && candidate.sourceOrdinal < followingOrdinal) {
        followingOrdinal = candidate.sourceOrdinal;
        followingIndex = index;
      }
    });

    const insertionIndex =
      precedingIndex >= 0 && (followingIndex < 0 || precedingIndex >= followingIndex)
        ? precedingIndex + 1
        : followingIndex >= 0
          ? followingIndex
          : ordered.length;
    ordered.splice(insertionIndex, 0, { column, sourceOrdinal });
  }

  return ordered.map(({ column }) => column);
}
