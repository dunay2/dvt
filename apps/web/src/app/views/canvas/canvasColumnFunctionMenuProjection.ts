/** Owned concern: project admitted column functions for one editable Canvas node. */
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { GraphNodeColumn } from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveDvtSubstraitProjectionEntry,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';

export type CanvasColumnFunctionMenuMap = Map<
  string,
  Readonly<{
    columnId: string;
    menu: NonNullable<GraphNodeColumn['functionMenu']>;
  }>
>;

export type CanvasColumnFunctionMenuProjection = Readonly<{
  hasEditableProjection: boolean;
  supportsCalculatedColumns: boolean;
  menus?: CanvasColumnFunctionMenuMap;
}>;

function addMenu(args: {
  menus: CanvasColumnFunctionMenuMap;
  columnId: string;
  name: string;
  dataType: string;
  provider: string;
}): void {
  const items = resolveDvtSubstraitColumnFunctions({
    dataType: args.dataType,
    provider: args.provider,
  });
  const category = items[0]?.category;
  if (category == null || items.length === 0) return;
  const value = { columnId: args.columnId, menu: { category, items } };
  args.menus.set(args.columnId, value);
  args.menus.set(args.name, value);
}

function projectDvtTransformMenus(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
}): CanvasColumnFunctionMenuProjection {
  try {
    const metadata = createDvtNodeAuthoringMetadata(args.node);
    const projection =
      metadata?.kind === 'transform' &&
      metadata.mode === 'substrait' &&
      metadata.shape === 'projection'
        ? resolveDvtSubstraitProjectionEntry({
            targetNode: args.node,
            nodes: args.nodes,
            edges: args.edges,
            draft: { plan: metadata.plan, sidecar: metadata.sidecar },
          })
        : null;
    if (projection == null)
      return { hasEditableProjection: false, supportsCalculatedColumns: false };
    const menus: CanvasColumnFunctionMenuMap = new Map();
    for (const output of projection.outputs) {
      addMenu({
        menus,
        columnId: output.fieldId,
        name: output.name,
        dataType: output.dataType,
        provider: projection.source.sourceRef.connectionRef.provider,
      });
    }
    return {
      hasEditableProjection: true,
      supportsCalculatedColumns: true,
      ...(menus.size === 0 ? {} : { menus }),
    };
  } catch {
    return { hasEditableProjection: false, supportsCalculatedColumns: false };
  }
}

function projectGeneratedDbtModelMenus(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
  presentationTruth?: CanvasNodePresentationTruth;
  presentedColumns?: readonly Readonly<{ name: string; type: string }>[];
}): CanvasColumnFunctionMenuProjection {
  const metadata = createDbtNodeAuthoringMetadata(args.node);
  const sourceIds = args.edges
    .filter((edge) => edge.targetId === args.node.id)
    .map((edge) => edge.sourceId);
  const sourceId =
    sourceIds.find((candidate) => candidate === metadata.selectedSourceId) ??
    (sourceIds.length === 1 ? sourceIds[0] : undefined);
  const sourceNode = args.nodes.find((candidate) => candidate.id === sourceId);
  const source = sourceNode == null ? null : resolveDvtSubstraitProjectionSource(sourceNode);
  if (source == null) return { hasEditableProjection: false, supportsCalculatedColumns: false };
  const menus: CanvasColumnFunctionMenuMap = new Map();
  const truthColumns = args.presentationTruth?.columns.visible;
  const columns =
    truthColumns != null && truthColumns.length > 0 ? truthColumns : args.presentedColumns;
  for (const column of columns ?? []) {
    addMenu({
      menus,
      columnId: column.name,
      name: column.name,
      dataType: column.type,
      provider: source.sourceRef.connectionRef.provider,
    });
  }
  return {
    hasEditableProjection: true,
    supportsCalculatedColumns: false,
    ...(menus.size === 0 ? {} : { menus }),
  };
}

export function projectCanvasColumnFunctionMenus(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
  presentationTruth?: CanvasNodePresentationTruth;
  presentedColumns?: readonly Readonly<{ name: string; type: string }>[];
}): CanvasColumnFunctionMenuProjection {
  if (args.node.pluginId === 'dvt' && args.node.kind === 'dvt:transform') {
    return projectDvtTransformMenus(args);
  }
  if (args.node.kind === 'dvt:source') {
    return { hasEditableProjection: false, supportsCalculatedColumns: false };
  }
  if (args.node.pluginId === 'dbt' && args.node.kind === 'dbt:model') {
    return projectGeneratedDbtModelMenus(args);
  }
  return { hasEditableProjection: false, supportsCalculatedColumns: false };
}
