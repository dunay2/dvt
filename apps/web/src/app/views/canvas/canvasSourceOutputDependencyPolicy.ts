/** Owned concern: protect Source outputs consumed by connected Transform expressions. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { inspectDvtSubstraitFilter, removeDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  decodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionOutput,
  type DvtSubstraitScalarExpression,
} from './canvasDvtSubstraitProjection';

function scalarExpressionUsesSourceField(
  expression: DvtSubstraitScalarExpression | undefined,
  columnName: string
): boolean {
  if (expression == null) return false;
  if (expression.kind === 'field-reference') return expression.sourceFieldName === columnName;
  if (expression.kind !== 'scalar-function') return false;
  return expression.arguments.some((argument) =>
    scalarExpressionUsesSourceField(argument, columnName)
  );
}

function projectionOutputUsesSourceField(
  output: DvtSubstraitProjectionOutput,
  inputFields: readonly Readonly<{ fieldId: string; name: string }>[],
  columnName: string
): boolean {
  if (output.sourceFieldName === columnName) return true;
  if (scalarExpressionUsesSourceField(output.scalarExpression, columnName)) return true;
  if (
    output.calculation?.kind === 'row-number' &&
    inputFields[output.calculation.orderSourceOrdinal]?.name === columnName
  ) {
    return true;
  }
  const inputNameById = new Map(inputFields.map((field) => [field.fieldId, field.name] as const));
  return (output.operandFieldIds ?? []).some(
    (fieldId) => inputNameById.get(fieldId) === columnName
  );
}

export function sourceOutputIsRequired(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  sourceNode: CanonicalNode;
  columnName: string;
}): boolean {
  let sourceProjection;
  try {
    sourceProjection = readDvtSourceOutputProjection(args.sourceNode);
  } catch {
    return true;
  }
  if (sourceProjection == null) return true;
  const nodes = resolveCanvasDraftNodes(args.draftSession, args.canonicalNodesById);
  const targetIds = new Set(
    args.draftSession.workingSet.visibleEdges
      .filter((edge) => edge.sourceId === args.sourceNode.id)
      .map((edge) => edge.targetId)
  );

  for (const targetId of targetIds) {
    const targetNode = nodes.find((node) => node.id === targetId);
    if (
      targetNode == null ||
      targetNode.pluginId !== 'dvt' ||
      targetNode.kind !== 'dvt:transform'
    ) {
      return true;
    }
    try {
      const authority = readDvtTransformAuthoringAuthority(targetNode);
      if (authority == null) continue;
      const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
      const projectionDraft =
        inspectDvtSubstraitFilter(draft) == null ? draft : removeDvtSubstraitFilter(draft);
      const inspection = inspectDvtSubstraitProjectionDraft(projectionDraft);
      if (!inspection.ok) return true;
      const source = inspection.projection.source;
      if (
        source.schema !== sourceProjection.source.schema ||
        source.table !== sourceProjection.source.table ||
        source.sourceRef.sourceObjectId !== sourceProjection.source.sourceRef.sourceObjectId ||
        source.sourceRef.connectionRef.connectionId !==
          sourceProjection.source.sourceRef.connectionRef.connectionId
      ) {
        return true;
      }
      if (
        inspection.projection.outputs.some((output) =>
          projectionOutputUsesSourceField(
            output,
            inspection.projection.inputFields,
            args.columnName
          )
        )
      ) {
        return true;
      }
    } catch {
      return true;
    }
  }
  return false;
}
