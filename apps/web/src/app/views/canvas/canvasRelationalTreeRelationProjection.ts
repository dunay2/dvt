/** Owned concern: project one canonical Substrait relation subtree into the Canvas tree read model. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { sortDirectionLabel } from './semanticWorkbenchRelationMetadata';
import type { SubstraitRelationIndex } from '@dvt/substrait-analysis';
import { dvtSubstraitExpressionReader } from '@dvt/postgres-projection';

import { canvasPresentationOperationForRel } from './canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeExpressionRef,
  CanvasRelationalTreeField,
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';

import {
  childInputs,
  relationAnchor,
  isAdmittedSort,
  isAdmittedFetch,
} from './canvasRelationalTraversal';
import { projectCanvasRelationalProjectStage } from './canvasRelationalProjectStage';

function operator(rel: Rel): CanvasRelationalTreeOperator {
  switch (rel.relType.case) {
    case 'read':
    case 'project':
    case 'filter':
    case 'join':
    case 'cross':
    case 'set':
    case 'aggregate':
      return rel.relType.case;
    case 'sort':
      return isAdmittedSort(rel) ? 'sort' : 'unsupported';
    case 'fetch':
      return isAdmittedFetch(rel) ? 'fetch' : 'unsupported';
    default:
      return 'unsupported';
  }
}

export function relationExpressionRefs(rel: Rel): readonly CanvasRelationalTreeExpressionRef[] {
  switch (rel.relType.case) {
    case 'filter':
      return rel.relType.value.condition == null ? [] : [{ slot: 'filter-condition', ordinal: 0 }];
    case 'join':
      return rel.relType.value.expression == null ? [] : [{ slot: 'join-condition', ordinal: 0 }];
    case 'project':
      return rel.relType.value.expressions.map((_, ordinal) => ({
        slot: 'project-expression',
        ordinal,
      }));
    case 'aggregate': {
      const aggregate = rel.relType.value;
      return [
        ...aggregate.groupingExpressions.map((_, ordinal) => ({
          slot: 'aggregate-expression' as const,
          ordinal,
        })),
        ...aggregate.measures.map((_, ordinal) => ({
          slot: 'aggregate-expression' as const,
          ordinal: aggregate.groupingExpressions.length + ordinal,
        })),
      ];
    }
    case 'sort':
      return rel.relType.value.sorts.map((_, ordinal) => ({ slot: 'sort-key', ordinal }));
    default:
      return [];
  }
}

function fieldsForRelation(
  index: SubstraitRelationIndex,
  relationId: string
): readonly CanvasRelationalTreeField[] {
  return (index.relations.get(relationId)?.fields ?? []).map((field) => ({
    fieldId: field.fieldId,
    outputOrdinal: field.outputOrdinal,
    displayName: field.displayName ?? null,
    sourceFieldId: field.sourceFieldId ?? null,
    operandFieldIds: field.operandFieldIds ?? [],
  }));
}

function sortFetchSummary(rel: Rel, index: SubstraitRelationIndex): string | null {
  if (rel.relType.case === 'fetch') {
    const literal = (expression: typeof rel.relType.value.countExpr): bigint | null => {
      const value =
        expression == null ? null : dvtSubstraitExpressionReader.literalValue(expression);
      return value?.dataType === 'i64' ? value.value : null;
    };
    return `LIMIT ${literal(rel.relType.value.countExpr)?.toString() ?? 'ALL'} · OFFSET ${literal(rel.relType.value.offsetExpr)?.toString() ?? '0'}`;
  }
  if (rel.relType.case !== 'sort' || rel.relType.value.input == null) return null;
  const inputAnchor = relationAnchor(rel.relType.value.input);
  const inputRelation = inputAnchor == null ? undefined : index.byAnchor.get(inputAnchor);
  const inputFields = inputRelation == null ? [] : fieldsForRelation(index, inputRelation);
  return rel.relType.value.sorts
    .map((field) => {
      const ordinal = dvtSubstraitExpressionReader.fieldOrdinal(field.expr);
      const name = ordinal == null ? null : inputFields[ordinal]?.displayName;
      const value =
        field.sortKind.case === 'direction' ? sortDirectionLabel(field.sortKind.value) : '';
      return name == null || value.length === 0 ? null : `${name} ${value}`;
    })
    .filter((value): value is string => value != null)
    .join(' · ');
}

export function buildCanvasRelationalTreeRelation(
  args: Readonly<{ index: SubstraitRelationIndex; digest: string }>
): CanvasRelationalTreeNode {
  const { index, digest } = args;
  const paths = new Map([[index.rootId, 'root']]);
  const children = new Map<string, ReturnType<typeof childInputs>>();
  for (let ordinal = index.postorder.length - 1; ordinal >= 0; ordinal -= 1) {
    const id = index.postorder[ordinal]!;
    const entry = index.relations.get(id)!;
    const inputs = childInputs(entry.relation);
    children.set(id, inputs);
    inputs.forEach((input, position) =>
      paths.set(entry.inputs[position]!, `${paths.get(id)}/${input.role}:${input.ordinal}`)
    );
  }
  const nodes = new Map<string, CanvasRelationalTreeNode>();
  for (const id of index.postorder) {
    const entry = index.relations.get(id)!;
    const rel = entry.relation;
    const projectStage = projectCanvasRelationalProjectStage(rel, index, entry.inputs);
    const windows = projectStage?.summary.windowFieldCount ?? 0;
    nodes.set(id, {
      locator: `rel:${digest}:${paths.get(id)}`,
      operator: operator(rel),
      substraitKind: rel.relType.case ?? 'unknown',
      operation: projectStage?.operation ?? canvasPresentationOperationForRel(rel),
      relationId: id,
      displayName: sortFetchSummary(rel, index) ?? entry.binding.displayName ?? null,
      sourceRef: entry.binding.sourceRef ?? null,
      output: { fields: fieldsForRelation(index, id) },
      expressionRefs: relationExpressionRefs(rel),
      ...(projectStage == null ? {} : { projectionSummary: projectStage.summary }),
      decorations: windows === 0 ? [] : [{ kind: 'window', count: windows }],
      children: children.get(id)!.map((input, position) => ({
        role: input.role,
        ordinal: input.ordinal,
        node: nodes.get(entry.inputs[position]!)!,
      })),
    });
  }
  return nodes.get(index.rootId)!;
}
