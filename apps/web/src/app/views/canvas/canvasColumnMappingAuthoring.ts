/** Owned concern: translate column-mapping intent into the existing DVT node command authority. */
import {
  DVT_TRANSFORM_AUTHORING_MODE,
  VISUAL_TRANSFORM_RECIPE_VERSION,
  type VisualTransformColumnInputRefV1,
  type VisualTransformOutputColumnV1,
  type VisualTransformRecipeV1,
} from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  applyDvtVisualTransformRecipe,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

export type CanvasColumnMappingSource = VisualTransformColumnInputRefV1;
export type CanvasColumnMappingTarget = Readonly<{
  nodeId: string;
  outputId?: string;
  columnName: string;
  dataType?: string;
}>;

export type CanvasColumnMappingRejection =
  | 'source_node_not_found'
  | 'target_node_not_found'
  | 'target_not_visual_transform'
  | 'source_not_connected'
  | 'source_column_not_found'
  | 'sql_authority_not_empty'
  | 'invalid_transform_authority'
  | 'complex_expression_not_editable'
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

type Column = Readonly<{ name: string; type: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readNonblankString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readColumns(node: CanonicalNode): readonly Column[] {
  const value = node.metadata?.columns;
  if (Array.isArray(value)) {
    return value.flatMap((candidate): readonly Column[] => {
      if (!isRecord(candidate)) return [];
      const name = readNonblankString(candidate.name);
      if (name == null) return [];
      return [
        { name, type: readNonblankString(candidate.type ?? candidate.dataType) ?? 'unknown' },
      ];
    });
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([fallbackName, candidate]): readonly Column[] => {
    if (!isRecord(candidate)) return [];
    const name = readNonblankString(candidate.name) ?? fallbackName.trim();
    if (name.length === 0) return [];
    return [{ name, type: readNonblankString(candidate.type ?? candidate.dataType) ?? 'unknown' }];
  });
}

function resolveSessionNode(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  nodeId: string
): CanonicalNode | undefined {
  return draftSession.localNodeCatalog?.[nodeId] ?? canonicalNodesById.get(nodeId);
}

function hasStageDependency(
  draftSession: CanvasDraftSession,
  sourceNodeId: string,
  targetNodeId: string
): boolean {
  return draftSession.workingSet.visibleEdges.some(
    (edge) => edge.sourceId === sourceNodeId && edge.targetId === targetNodeId
  );
}

function createOutputId(columnName: string): string {
  return `output:${encodeURIComponent(columnName)}`;
}

function createEmptyRecipe(): VisualTransformRecipeV1 {
  return {
    version: VISUAL_TRANSFORM_RECIPE_VERSION,
    outputs: [],
    filters: [],
  };
}

function readEditableRecipe(
  targetNode: CanonicalNode
):
  | Readonly<{ outcome: 'ready'; recipe: VisualTransformRecipeV1 }>
  | Readonly<{ outcome: 'rejected'; reason: CanvasColumnMappingRejection }> {
  if (targetNode.pluginId !== 'dvt' || targetNode.kind !== 'dvt:sql_transform') {
    return { outcome: 'rejected', reason: 'target_not_visual_transform' };
  }

  try {
    const authority = readDvtTransformAuthoringAuthority(targetNode);
    if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
      return { outcome: 'ready', recipe: authority.recipe };
    }
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.sql) {
      return { outcome: 'rejected', reason: 'target_not_visual_transform' };
    }
    if (authority.sql.trim().length > 0) {
      return { outcome: 'rejected', reason: 'sql_authority_not_empty' };
    }
    return { outcome: 'ready', recipe: createEmptyRecipe() };
  } catch {
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }
}

export function canAuthorCanvasColumnMappings(targetNode: CanonicalNode): boolean {
  return readEditableRecipe(targetNode).outcome === 'ready';
}

export function resolveCanvasColumnMappingTarget(
  targetNode: CanonicalNode,
  columnId: string
): CanvasColumnMappingTarget | null {
  if (targetNode.pluginId !== 'dvt' || targetNode.kind !== 'dvt:sql_transform') return null;
  try {
    const authority = readDvtTransformAuthoringAuthority(targetNode);
    if (authority.mode === DVT_TRANSFORM_AUTHORING_MODE.visual) {
      const output = authority.recipe.outputs.find((candidate) => candidate.id === columnId);
      return output == null
        ? { nodeId: targetNode.id, columnName: columnId }
        : {
            nodeId: targetNode.id,
            outputId: output.id,
            columnName: output.name,
            ...(output.dataType == null ? {} : { dataType: output.dataType }),
          };
    }
    if (authority.mode !== DVT_TRANSFORM_AUTHORING_MODE.sql) return null;
    const targetColumn = readColumns(targetNode).find((column) => column.name === columnId);
    return {
      nodeId: targetNode.id,
      columnName: columnId,
      ...(targetColumn?.type == null ? {} : { dataType: targetColumn.type }),
    };
  } catch {
    return null;
  }
}

function isSimplePassthrough(output: VisualTransformOutputColumnV1): boolean {
  return (
    output.expression.inputs.length <= 1 &&
    output.expression.operations.length === 1 &&
    output.expression.operations[0]?.kind === 'passthrough'
  );
}

export function applyCanvasColumnMapping(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  source: CanvasColumnMappingSource;
  target: CanvasColumnMappingTarget;
}): CanvasColumnMappingResult {
  const sourceNode = resolveSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.source.nodeId
  );
  if (sourceNode == null) return { outcome: 'rejected', reason: 'source_node_not_found' };
  const targetNode = resolveSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.target.nodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  if (!hasStageDependency(args.draftSession, sourceNode.id, targetNode.id)) {
    return { outcome: 'rejected', reason: 'source_not_connected' };
  }
  const sourceColumn = readColumns(sourceNode).find(
    (column) => column.name === args.source.columnName
  );
  if (sourceColumn == null) {
    return { outcome: 'rejected', reason: 'source_column_not_found' };
  }

  const recipeResult = readEditableRecipe(targetNode);
  if (recipeResult.outcome === 'rejected') return recipeResult;
  const outputIndex = recipeResult.recipe.outputs.findIndex((output) =>
    args.target.outputId != null
      ? output.id === args.target.outputId
      : output.name === args.target.columnName
  );
  const currentOutput = recipeResult.recipe.outputs[outputIndex];
  if (currentOutput != null && !isSimplePassthrough(currentOutput)) {
    return { outcome: 'rejected', reason: 'complex_expression_not_editable' };
  }

  const nextOutput: VisualTransformOutputColumnV1 = {
    id: currentOutput?.id ?? args.target.outputId ?? createOutputId(args.target.columnName),
    name: currentOutput?.name ?? args.target.columnName,
    ...(currentOutput?.dataType != null || args.target.dataType != null || sourceColumn.type != null
      ? { dataType: currentOutput?.dataType ?? args.target.dataType ?? sourceColumn.type }
      : {}),
    expression: {
      inputs: [args.source],
      operations: [{ kind: 'passthrough' }],
    },
  };
  const nextOutputs = [...recipeResult.recipe.outputs];
  if (outputIndex < 0) nextOutputs.push(nextOutput);
  else nextOutputs[outputIndex] = nextOutput;
  const nextNode = applyDvtVisualTransformRecipe(targetNode, {
    ...recipeResult.recipe,
    outputs: nextOutputs,
  });

  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, nextNode),
  };
}

function normalizeKnownType(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replaceAll(/\s+/g, ' ');
  if (normalized == null || normalized.length === 0 || normalized === 'unknown') return null;
  const aliases: Record<string, string> = {
    int: 'integer',
    int4: 'integer',
    int8: 'bigint',
    varchar: 'text',
    'character varying': 'text',
    bool: 'boolean',
  };
  return aliases[normalized] ?? normalized;
}

export function areCanvasColumnTypesCompatible(left: string, right: string): boolean {
  const normalizedLeft = normalizeKnownType(left);
  const normalizedRight = normalizeKnownType(right);
  return normalizedLeft != null && normalizedLeft === normalizedRight;
}

export function automapCanvasColumns(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
  targetColumns: readonly Column[];
}): CanvasColumnAutomapResult {
  const targetNode = resolveSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.targetNodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  const recipeResult = readEditableRecipe(targetNode);
  if (recipeResult.outcome === 'rejected') return recipeResult;
  const mappedInputs = new Set(
    recipeResult.recipe.outputs.flatMap((output) =>
      output.expression.inputs.map((input) => `${input.nodeId}\u0000${input.columnName}`)
    )
  );
  const upstreamNodes = args.draftSession.workingSet.visibleEdges
    .filter((edge) => edge.targetId === args.targetNodeId)
    .map((edge) => resolveSessionNode(args.draftSession, args.canonicalNodesById, edge.sourceId))
    .filter((node): node is CanonicalNode => node != null);
  const candidates = upstreamNodes.flatMap((node) =>
    readColumns(node).flatMap((column) =>
      mappedInputs.has(`${node.id}\u0000${column.name}`) ? [] : [{ node, column }]
    )
  );
  let draftSession = args.draftSession;
  let appliedCount = 0;

  for (const targetColumn of args.targetColumns) {
    const matches = candidates.filter(
      ({ column }) =>
        column.name === targetColumn.name &&
        areCanvasColumnTypesCompatible(column.type, targetColumn.type)
    );
    if (matches.length !== 1) continue;
    const match = matches[0];
    if (match == null) continue;
    const result = applyCanvasColumnMapping({
      draftSession,
      canonicalNodesById: args.canonicalNodesById,
      source: { nodeId: match.node.id, columnName: match.column.name },
      target: {
        nodeId: args.targetNodeId,
        columnName: targetColumn.name,
        dataType: targetColumn.type,
      },
    });
    if (result.outcome === 'rejected') {
      if (result.reason === 'complex_expression_not_editable') continue;
      return result;
    }
    draftSession = result.draftSession;
    appliedCount += 1;
  }

  if (appliedCount === 0) {
    return { outcome: 'rejected', reason: 'no_compatible_mappings' };
  }
  return {
    outcome: 'applied',
    draftSession,
    appliedCount,
    skippedCount: args.targetColumns.length - appliedCount,
  };
}

export function removeCanvasColumnMapping(args: {
  draftSession: CanvasDraftSession;
  targetNode: CanonicalNode;
  outputId: string;
  source: CanvasColumnMappingSource;
}): CanvasColumnMappingResult {
  const recipeResult = readEditableRecipe(args.targetNode);
  if (recipeResult.outcome === 'rejected') return recipeResult;
  const outputIndex = recipeResult.recipe.outputs.findIndex(
    (output) => output.id === args.outputId
  );
  const output = recipeResult.recipe.outputs[outputIndex];
  if (output == null) return { outcome: 'rejected', reason: 'mapping_not_found' };
  const remainingInputs = output.expression.inputs.filter(
    (input) => input.nodeId !== args.source.nodeId || input.columnName !== args.source.columnName
  );
  if (remainingInputs.length === output.expression.inputs.length) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const nextOutputs =
    remainingInputs.length === 0
      ? recipeResult.recipe.outputs.filter((_, index) => index !== outputIndex)
      : recipeResult.recipe.outputs.map((candidate, index) =>
          index === outputIndex
            ? { ...candidate, expression: { ...candidate.expression, inputs: remainingInputs } }
            : candidate
        );
  const nextNode = applyDvtVisualTransformRecipe(args.targetNode, {
    ...recipeResult.recipe,
    outputs: nextOutputs,
  });

  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, nextNode),
  };
}
