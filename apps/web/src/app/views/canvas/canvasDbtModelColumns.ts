/** Resolve DBT column candidates independently of SQL artifact readiness. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import {
  createDbtNodeAuthoringMetadata,
  isDbtCompatibleModel,
  resolveDbtModelConnectedOrigin,
} from './canvasDbtAuthoringModel';
import { resolveDbtModelProjectionColumns } from './canvasDbtModelColumnAuthoring';
import {
  isObjectFilePostgresNode,
  resolveObjectFilePostgresAuthoringMetadata,
} from './objectFilePostgresAuthoringModel';

export function readDbtModelAvailableColumnNames(
  args: Readonly<{
    modelNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  }>
): readonly string[] {
  if (!isDbtCompatibleModel(args.modelNode)) return [];
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  const inputs = new Map<string, CanonicalNode[]>();
  for (const edge of args.edges) {
    const source = nodes.get(edge.sourceId);
    if (source == null) continue;
    const connected = inputs.get(edge.targetId) ?? [];
    connected.push(source);
    inputs.set(edge.targetId, connected);
  }
  const visited = new Set<string>();
  const upstreamModels: CanonicalNode[] = [];
  let current: CanonicalNode | null = args.modelNode;
  let names: readonly string[] = [];
  while (current != null) {
    if (visited.has(current.id)) return [];
    visited.add(current.id);
    names = isObjectFilePostgresNode(current)
      ? (resolveObjectFilePostgresAuthoringMetadata(current)?.columns.map(
          (column) => column.targetColumn
        ) ?? [])
      : buildCanvasNodePresentationTruth({
          node: current,
          nodes: [current],
          edges: [],
        }).columns.declared.map((column) => column.name);
    if (names.length > 0 || !isDbtCompatibleModel(current)) break;
    current =
      resolveDbtModelConnectedOrigin(
        inputs.get(current.id) ?? [],
        createDbtNodeAuthoringMetadata(current).selectedSourceId
      ) ?? null;
    if (current != null && isDbtCompatibleModel(current)) upstreamModels.push(current);
  }
  for (const model of upstreamModels.reverse()) {
    names = resolveDbtModelProjectionColumns(
      createDbtNodeAuthoringMetadata(model).projectionColumns,
      names
    )
      .filter((column) => column.output)
      .map((column) => column.name);
  }
  return names;
}
