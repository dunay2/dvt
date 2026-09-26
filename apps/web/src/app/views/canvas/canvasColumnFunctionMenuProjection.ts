/** Owned concern: project admitted column functions for one editable Canvas node. */
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnFunction,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { inspectProjectionDataType } from './canvasDvtSubstraitProjectionStructure';
import {
  canvasInputSchemaIsEligible,
  resolveUnmappedCanvasReadFields,
} from './canvasInputFieldEligibility';
import { resolveDvtSubstraitColumnFunctions } from './canvasDvtSubstraitProjection';

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
    const resolved = resolveCanvasSubstraitGraphBindings(args);
    const analysis = deriveSubstraitSchemas(resolved.document);
    const deniedInputs = resolveUnmappedCanvasReadFields({
      ...args,
      document: resolved.document,
      nodeId: args.node.id,
    });
    const root = analysis.index.relations.get(analysis.index.rootId)!;
    const provider = resolved.connection.provider;
    const menus: CanvasColumnFunctionMenuMap = new Map();
    const projectFields = (relationId: string): GraphNodeColumn[] => {
      const entry = analysis.index.relations.get(relationId)!;
      return entry.fields
        .filter(
          (field) =>
            field.parentFieldId == null &&
            canvasInputSchemaIsEligible(
              analysis.schemas.get(relationId)![field.outputOrdinal]!,
              deniedInputs
            )
        )
        .map((field) => {
          const type = inspectProjectionDataType(
            analysis.schemas.get(relationId)![field.outputOrdinal]!.type
          );
          if (type == null) throw new Error('Unsupported calculated-column operand type.');
          const name = field.displayName ?? field.fieldId;
          addMenu({ menus, columnId: field.fieldId, name, dataType: type, provider });
          const menu = menus.get(field.fieldId)?.menu;
          return { id: field.fieldId, name, type, ...(menu == null ? {} : { functionMenu: menu }) };
        });
    };
    const inputId =
      root.relation.relType.case === 'project' ? root.inputs[0]! : analysis.index.rootId;
    const inputColumns = projectFields(inputId);
    const inputIds = new Set(inputColumns.map((field) => field.id));
    const outputs = projectFields(analysis.index.rootId);
    const expressionInputs = [
      ...inputColumns,
      ...outputs.filter((output) => {
        const binding = root.fields.find((field) => field.fieldId === output.id)!;
        return (
          !inputIds.has(output.id) &&
          (binding.sourceFieldId == null || !inputIds.has(binding.sourceFieldId))
        );
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
