/** Owned concern: project admitted column functions for one editable Canvas node. */
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnFunction,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  inspectDvtSubstraitProjectionDraft,
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
  expressionInputs?: readonly GraphNodeColumn[];
  resolveCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
}>;

function projectMenu(args: {
  dataType: string;
  provider: string;
}): NonNullable<GraphNodeColumn['functionMenu']> | undefined {
  const items = resolveDvtSubstraitColumnFunctions({
    dataType: args.dataType,
    provider: args.provider,
    resolution: 'proposal',
  });
  const category = items[0]?.category;
  return category == null || items.length === 0 ? undefined : { category, items };
}

function addMenu(args: {
  menus: CanvasColumnFunctionMenuMap;
  columnId: string;
  name: string;
  dataType: string;
  provider: string;
}): void {
  const menu = projectMenu(args);
  if (menu == null) return;
  const value = {
    columnId: args.columnId,
    dataType: args.dataType,
    menu,
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
    if (draft == null || projection == null)
      return { hasEditableProjection: false, supportsCalculatedColumns: false };
    const inspection = inspectDvtSubstraitProjectionDraft(draft);
    if (!inspection.ok) return { hasEditableProjection: false, supportsCalculatedColumns: false };
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
    const inputIds = new Set(inspection.projection.inputFields.map((field) => field.fieldId));
    const inputNames = new Set(inspection.projection.inputFields.map((field) => field.name));
    const expressionInputs: GraphNodeColumn[] = [
      ...inspection.projection.inputFields.map((field) => {
        const menu = projectMenu({ dataType: field.dataType, provider });
        return {
          id: field.fieldId,
          name: field.name,
          type: field.dataType,
          ...(menu == null ? {} : { functionMenu: menu }),
        };
      }),
      ...projection.outputs.flatMap((output) => {
        if (
          (output.sourceFieldId != null && inputIds.has(output.sourceFieldId)) ||
          (output.sourceFieldName != null && inputNames.has(output.sourceFieldName))
        ) {
          return [];
        }
        const menu = projectMenu({ dataType: output.dataType, provider });
        return [
          {
            id: output.fieldId,
            name: output.name,
            type: output.dataType,
            ...(menu == null ? {} : { functionMenu: menu }),
          },
        ];
      }),
    ];
    return {
      hasEditableProjection: true,
      supportsCalculatedColumns: true,
      expressionInputs,
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
