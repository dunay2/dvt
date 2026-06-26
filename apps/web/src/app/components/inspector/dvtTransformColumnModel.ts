/** Owned concern: project upstream source columns for transform workbench selection. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export type TransformColumnOption = Readonly<{
  columnName: string;
  columnRef: string;
  dataType: string;
  nullable?: boolean;
  selected: boolean;
  sourceNodeId: string;
  sourceNodeName: string;
}>;

type BuildTransformColumnOptionsArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  selectedColumnRefs: readonly string[];
}>;

export type DvtTransformColumnOption = TransformColumnOption;

type TransformColumn = Readonly<{
  name: string;
  type: string;
  nullable?: boolean;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate): readonly string[] => {
    const text = readString(candidate);
    return text == null ? [] : [text];
  });
}

function readMetadataConfig(metadata: CanonicalNode['metadata']): Record<string, unknown> {
  const config = metadata?.config;
  return isRecord(config) ? config : {};
}

function readColumns(value: unknown): readonly TransformColumn[] {
  const readColumn = (candidate: unknown, fallbackName?: string): readonly TransformColumn[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name) ?? fallbackName;
    if (name == null) {
      return [];
    }

    return [
      {
        name,
        type: readString(candidate.type) ?? readString(candidate.dataType) ?? 'unknown',
        nullable: readBoolean(candidate.nullable),
      },
    ];
  };

  if (Array.isArray(value)) {
    return value.flatMap((candidate): readonly TransformColumn[] => readColumn(candidate));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([name, candidate]) => readColumn(candidate, name));
  }

  return [];
}

export function readSelectedColumnRefs(metadata: CanonicalNode['metadata']): readonly string[] {
  return readStringArray(readMetadataConfig(metadata).selectedColumns);
}

export function buildTransformColumnOptions({
  node,
  nodes,
  edges,
  selectedColumnRefs,
}: BuildTransformColumnOptionsArgs): readonly TransformColumnOption[] {
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const selectedColumnRefSet = new Set(selectedColumnRefs);
  const upstreamNodeIds = edges
    .filter((edge) => edge.targetId === node.id)
    .map((edge) => edge.sourceId);

  return upstreamNodeIds.flatMap((sourceNodeId): readonly TransformColumnOption[] => {
    const sourceNode = nodeById.get(sourceNodeId);
    if (sourceNode == null) {
      return [];
    }

    return readColumns(sourceNode.metadata?.columns).map((column) => {
      const columnRef = `${sourceNode.id}.${column.name}`;

      return {
        columnName: column.name,
        columnRef,
        dataType: column.type,
        nullable: column.nullable,
        selected: selectedColumnRefSet.has(columnRef),
        sourceNodeId: sourceNode.id,
        sourceNodeName: sourceNode.name,
      };
    });
  });
}

export const readDvtSelectedColumnRefs = readSelectedColumnRefs;
export const buildDvtTransformColumnOptions = buildTransformColumnOptions;
