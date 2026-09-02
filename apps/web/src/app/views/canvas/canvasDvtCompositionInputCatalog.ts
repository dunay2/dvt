/** Owned concern: resolve connected source relations available for canonical DVT composition. */
import { ConnectedSourceRefSchema, type ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export type CanvasDvtCompositionField = Readonly<{
  name: string;
  dataType: string;
  stringCompatible: boolean;
}>;

export type CanvasDvtCompositionInput = Readonly<{
  nodeId: string;
  schema: string;
  table: string;
  sourceRef: ConnectedSourceRef;
  fields: readonly CanvasDvtCompositionField[];
}>;

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isStringCompatible(dataType: string): boolean {
  return new Set(['text', 'string', 'varchar', 'character varying', 'char', 'character']).has(
    dataType.trim().toLowerCase().replaceAll(/\s+/g, ' ')
  );
}

function readFields(node: CanonicalNode): readonly CanvasDvtCompositionField[] | null {
  if (!Array.isArray(node.metadata?.columns)) return null;
  const fields = node.metadata.columns.map((candidate) => {
    if (candidate == null || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
    const record = candidate as Record<string, unknown>;
    const name = readText(record.name);
    const dataType = readText(record.type ?? record.dataType);
    return name == null || dataType == null
      ? null
      : { name, dataType, stringCompatible: isStringCompatible(dataType) };
  });
  if (fields.some((field) => field == null)) return null;
  const resolved = fields.filter((field) => field != null);
  return resolved.length > 0 &&
    new Set(resolved.map((field) => field.name)).size === resolved.length
    ? resolved
    : null;
}

function resolveInput(node: CanonicalNode): CanvasDvtCompositionInput | null {
  if (node.kind !== 'dvt:source' || node.role !== 'input') return null;
  const sourceRef = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  const schema = readText(node.metadata?.schema);
  const table = readText(node.metadata?.tableName);
  const fields = readFields(node);
  return !sourceRef.success || schema == null || table == null || fields == null
    ? null
    : { nodeId: node.id, schema, table, sourceRef: sourceRef.data, fields };
}

export function resolveCanvasDvtCompositionInputs(
  args: Readonly<{
    targetNodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  }>
): readonly CanvasDvtCompositionInput[] {
  const sourceIds = new Set(
    args.edges.filter((edge) => edge.targetId === args.targetNodeId).map((edge) => edge.sourceId)
  );
  return args.nodes
    .filter((node) => sourceIds.has(node.id))
    .map(resolveInput)
    .filter((input): input is CanvasDvtCompositionInput => input != null);
}
