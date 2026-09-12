/** Owned concern: project admitted column functions for one editable Canvas node. */
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnFunction,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveDvtSubstraitProjectionEntry,
} from './canvasDvtSubstraitProjection';

export type CanvasColumnFunctionMenuMap = Map<
  string,
  Readonly<{
    columnId: string;
    dataType: string;
    menu: NonNullable<GraphNodeColumn['functionMenu']>;
  }>
>;

export type CanvasColumnFunctionMenuProjection = Readonly<{
  hasEditableProjection: boolean;
  supportsCalculatedColumns: boolean;
  menus?: CanvasColumnFunctionMenuMap;
  resolveCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
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
    resolution: 'proposal',
  });
  const category = items[0]?.category;
  if (category == null || items.length === 0) return;
  const value = {
    columnId: args.columnId,
    dataType: args.dataType,
    menu: { category, items },
  };
  args.menus.set(args.columnId, value);
  args.menus.set(args.name, value);
}

export function resolveCanvasColumnCompositionFunctions(args: {
  provider: string;
  targetType: string;
  sourceType: string;
}): readonly GraphNodeColumnFunction[] {
  return resolveDvtSubstraitColumnFunctions({
    dataTypes: [args.targetType, args.sourceType],
    provider: args.provider,
    resolution: 'complete',
  }).filter(
    (item) =>
      item.minimumArgumentCount <= 2 &&
      (item.maximumArgumentCount == null || item.maximumArgumentCount >= 2)
  );
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
    const provider = projection.source.sourceRef.connectionRef.provider;
    return {
      hasEditableProjection: true,
      supportsCalculatedColumns: true,
      ...(menus.size === 0 ? {} : { menus }),
      resolveCompositionFunctions: ({ targetType, sourceType }) =>
        resolveCanvasColumnCompositionFunctions({ provider, targetType, sourceType }),
    };
  } catch {
    return { hasEditableProjection: false, supportsCalculatedColumns: false };
  }
}

export function projectCanvasColumnFunctionMenus(args: {
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Readonly<{ sourceId: string; targetId: string }>[];
}): CanvasColumnFunctionMenuProjection {
  if (args.node.pluginId === 'dvt' && args.node.kind === 'dvt:transform') {
    return projectDvtTransformMenus(args);
  }
  return { hasEditableProjection: false, supportsCalculatedColumns: false };
}
