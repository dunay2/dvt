/** Owned concern: resolve connected Canvas Sources that can participate in DVT INNER JOIN authoring. */
import { ConnectedSourceRefSchema, type ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitJoinInput,
} from './canvasDvtSubstraitJoinComposition';

function readMetadataText(node: CanonicalNode, key: string): string | null {
  const value = node.metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readSourceColumnNames(node: CanonicalNode): readonly string[] | null {
  const columns = node.metadata?.columns;
  if (!Array.isArray(columns)) return null;
  const names = columns.map((column) => {
    if (column == null || typeof column !== 'object' || Array.isArray(column)) return null;
    const name = (column as Record<string, unknown>).name;
    const type = (column as Record<string, unknown>).type;
    return typeof name === 'string' && name.trim().length > 0 && type === 'string'
      ? name.trim()
      : null;
  });
  return names.some((name) => name == null) ? null : names.filter((name) => name != null);
}

function resolveJoinInput(node: CanonicalNode): DvtSubstraitJoinInput | null {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return null;
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  const schema = readMetadataText(node, 'schema');
  const table = readMetadataText(node, 'tableName');
  const columns = readSourceColumnNames(node);
  if (
    !connectedSourceRef.success ||
    connectedSourceRef.data.connectionRef.provider !== 'postgres' ||
    schema == null ||
    table == null ||
    columns == null
  ) {
    return null;
  }
  return {
    source: { nodeId: node.id, schema, table, sourceRef: connectedSourceRef.data },
    fields: columns,
  };
}

function hasSameConnectionRef(
  first: ConnectedSourceRef['connectionRef'],
  second: ConnectedSourceRef['connectionRef']
): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.provider === second.provider &&
    first.connectionId === second.connectionId
  );
}

function hasSameConnectedSourceRef(first: ConnectedSourceRef, second: ConnectedSourceRef): boolean {
  return (
    first.schemaVersion === second.schemaVersion &&
    first.sourceObjectId === second.sourceObjectId &&
    hasSameConnectionRef(first.connectionRef, second.connectionRef)
  );
}

export function resolveDvtSubstraitJoinAppendCandidates(args: {
  targetNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  draft: DvtSubstraitInnerJoinDraft;
}): readonly DvtSubstraitJoinInput[] {
  if (
    args.targetNode.pluginId !== 'dvt' ||
    args.targetNode.kind !== 'dvt:transform' ||
    args.targetNode.role !== 'transform'
  ) {
    return [];
  }
  const inspection = inspectDvtSubstraitNInputJoinDraft(args.draft);
  if (!inspection.ok) return [];
  const firstInput = inspection.projection.inputs[0];
  if (firstInput == null) return [];
  const connectedIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNode.id).map((edge) => edge.sourceId)
  );
  return args.nodes
    .filter((node) => connectedIds.has(node.id))
    .map(resolveJoinInput)
    .filter(
      (input): input is DvtSubstraitJoinInput =>
        input != null &&
        hasSameConnectionRef(
          firstInput.sourceRef.connectionRef,
          input.source.sourceRef.connectionRef
        ) &&
        !inspection.projection.inputs.some((existing) =>
          hasSameConnectedSourceRef(existing.sourceRef, input.source.sourceRef)
        )
    )
    .sort((left, right) =>
      `${left.source.table}:${left.source.nodeId}`.localeCompare(
        `${right.source.table}:${right.source.nodeId}`
      )
    );
}
