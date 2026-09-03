import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';

export type CanvasColumnMappingSource = Readonly<{ nodeId: string; columnName: string }>;
export type CanvasColumnMappingTarget = Readonly<{
  nodeId: string;
  outputId?: string;
  columnName: string;
  dataType?: string;
}>;

export type CanvasColumnMappingRejection =
  | 'source_node_not_found'
  | 'target_node_not_found'
  | 'target_not_canonical_transform'
  | 'source_not_connected'
  | 'source_column_not_found'
  | 'invalid_transform_authority'
  | 'complex_expression_not_editable'
  | 'projection_requires_one_connected_source'
  | 'mapping_not_found'
  | 'no_compatible_mappings';

export type CanvasColumnMappingResult =
  | Readonly<{ outcome: 'applied'; draftSession: CanvasDraftSession }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasColumnMappingRejection }>;

export type CanvasColumnAutomapResult =
  | Readonly<{
      outcome: 'applied';
      draftSession: CanvasDraftSession;
      appliedCount: number;
      skippedCount: number;
    }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasColumnMappingRejection }>;

export type CanvasColumn = Readonly<{ name: string; type: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readNonblankString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function readCanvasNodeColumns(node: CanonicalNode): readonly CanvasColumn[] {
  const value = node.metadata?.columns;
  if (Array.isArray(value)) {
    return value.flatMap((candidate): readonly CanvasColumn[] => {
      if (!isRecord(candidate)) return [];
      const name = readNonblankString(candidate.name);
      if (name == null) return [];
      return [
        { name, type: readNonblankString(candidate.type ?? candidate.dataType) ?? 'unknown' },
      ];
    });
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([fallbackName, candidate]): readonly CanvasColumn[] => {
    if (!isRecord(candidate)) return [];
    const name = readNonblankString(candidate.name) ?? fallbackName.trim();
    if (name.length === 0) return [];
    return [{ name, type: readNonblankString(candidate.type ?? candidate.dataType) ?? 'unknown' }];
  });
}

export function resolveCanvasSessionNode(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  nodeId: string
): CanonicalNode | undefined {
  return draftSession.localNodeCatalog?.[nodeId] ?? canonicalNodesById.get(nodeId);
}

export function hasCanvasStageDependency(
  draftSession: CanvasDraftSession,
  sourceNodeId: string,
  targetNodeId: string
): boolean {
  return draftSession.workingSet.visibleEdges.some(
    (edge) => edge.sourceId === sourceNodeId && edge.targetId === targetNodeId
  );
}

export function createCanvasColumnOutputId(columnName: string): string {
  return `output:${encodeURIComponent(columnName)}`;
}
