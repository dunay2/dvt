/** Owned concern: project one provenance-preserving node truth for passive Canvas consumers. */
import type {
  CanvasNodeCodeLanguage,
  CanvasNodeCodeTruth,
  CanvasNodePresentationColumn,
  CanvasNodePresentationTruth,
} from './canvasNodePresentationTruth.contract';
import {
  buildTransformColumnOptions,
  readSelectedColumnRefs,
} from '../inspector/dvtTransformColumnModel';
import type { CanonicalNode } from '../../types/canonical';

export type CanvasNodePresentationEdge = Readonly<{
  sourceId: string;
  targetId: string;
}>;

type BuildCanvasNodePresentationTruthArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanvasNodePresentationEdge[];
}>;

type ColumnCandidate = Readonly<{
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

function readColumn(candidate: unknown, fallbackName?: string): readonly ColumnCandidate[] {
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
}

function readDeclaredColumns(value: unknown): readonly CanvasNodePresentationColumn[] {
  const candidates = Array.isArray(value)
    ? value.flatMap((candidate) => readColumn(candidate))
    : isRecord(value)
      ? Object.entries(value).flatMap(([name, candidate]) => readColumn(candidate, name))
      : [];

  return candidates.map((column) => ({ ...column, provenance: 'declared' as const }));
}

function readInheritedColumns({
  node,
  nodes,
  edges,
}: BuildCanvasNodePresentationTruthArgs): readonly CanvasNodePresentationColumn[] {
  if (node.role !== 'transform') {
    return [];
  }

  return buildTransformColumnOptions({
    node,
    nodes,
    edges: edges.map((edge, index) => ({
      id: `${edge.sourceId}->${edge.targetId}:${index}`,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relation: 'lineage',
    })),
    selectedColumnRefs: readSelectedColumnRefs(node.metadata),
  }).map((column) => ({
    name: column.columnName,
    type: column.dataType,
    nullable: column.nullable,
    provenance: 'inherited' as const,
    sourceNodeId: column.sourceNodeId,
    sourceNodeName: column.sourceNodeName,
    reference: column.columnRef,
    selected: column.selected,
  }));
}

function resolveCodeLanguage(path: string | undefined): CanvasNodeCodeLanguage {
  const normalizedPath = path?.toLowerCase();
  if (normalizedPath?.endsWith('.sql')) {
    return 'sql';
  }
  if (normalizedPath?.endsWith('.yml') || normalizedPath?.endsWith('.yaml')) {
    return 'yaml';
  }
  if (normalizedPath?.endsWith('.json')) {
    return 'json';
  }
  return 'text';
}

function buildCodeTruth(node: CanonicalNode): CanvasNodeCodeTruth {
  const metadata = isRecord(node.metadata) ? node.metadata : {};
  const config = isRecord(metadata.config) ? metadata.config : {};
  const path = node.path ?? readString(metadata.path);
  const inlineCode =
    readString(metadata.compiledSql) ?? readString(metadata.sql) ?? readString(config.sql);

  if (inlineCode != null) {
    return {
      kind: 'inline',
      content: inlineCode,
      language: 'sql',
      ...(path == null ? {} : { path }),
    };
  }

  if (path != null) {
    return {
      kind: 'workspace-file',
      path,
      language: resolveCodeLanguage(path),
    };
  }

  return { kind: 'unavailable' };
}

export function buildCanvasNodePresentationTruth(
  args: BuildCanvasNodePresentationTruthArgs
): CanvasNodePresentationTruth {
  const declared = readDeclaredColumns(args.node.metadata?.columns);
  const inherited = readInheritedColumns(args);
  const visible = declared.length > 0 ? declared : inherited;

  return {
    columns: {
      declared,
      inherited,
      visible,
      declaredCount: declared.length,
      inheritedCount: inherited.length,
      visibleCount: visible.length,
      visibleProvenance:
        declared.length > 0 ? 'declared' : inherited.length > 0 ? 'inherited' : 'none',
    },
    code: buildCodeTruth(args.node),
  };
}
