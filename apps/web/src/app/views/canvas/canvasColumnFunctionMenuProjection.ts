/** Owned concern: project admitted column functions for one editable Canvas node. */
import type { GraphNodeColumn } from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import { projectDvtSubstraitOperableOutput } from './canvasDvtSubstraitOperableExpression';
import {
  resolveDvtSubstraitColumnFunctions,
  resolveDvtSubstraitProjectionEntry,
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
    const draft =
      metadata?.kind === 'transform' &&
      metadata.mode === 'substrait' &&
      metadata.shape === 'projection'
        ? { plan: metadata.plan, sidecar: metadata.sidecar }
        : null;
    const projection =
      draft == null
        ? null
        : resolveDvtSubstraitProjectionEntry({
            targetNode: args.node,
            nodes: args.nodes,
            edges: args.edges,
            draft,
          });
    if (projection == null || draft == null)
      return { hasEditableProjection: false, supportsCalculatedColumns: false };
    const menus: CanvasColumnFunctionMenuMap = new Map();
    for (const output of projection.outputs) {
      if (
        projectDvtSubstraitOperableOutput({ draft, projection, fieldId: output.fieldId }) == null
      ) {
        return { hasEditableProjection: false, supportsCalculatedColumns: false };
      }
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
