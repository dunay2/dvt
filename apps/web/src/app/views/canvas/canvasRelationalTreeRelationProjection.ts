/**
 * Owned concern: project canonical relation subtrees into visible Canvas cards.
 * @baseline ADR-0064: only explicit identity bindings define an authoring group.
 * @decision Hide owned internal stages in presentation, not in the canonical document.
 * @consequence Adjacent independent transforms retain separate cards and external input boundaries.
 * @version 1.0.0
 */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  readSubstraitAuthoringGroup,
  type SubstraitRelationIndex,
  type RelationPublication,
} from '@dvt/substrait-analysis';

import { canvasPresentationOperationForRel } from './canvasRelationalOperationPresentation';
import type {
  CanvasRelationalTreeExpressionRef,
  CanvasRelationalTreeField,
  CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';

import { childInputs } from './canvasRelationalTraversal';
import {
  physicalReadPresentation,
  operator,
  sortFetchSummary,
} from './canvasRelationalRelationPresentation';
import { projectCanvasRelationalProjectStage } from './canvasRelationalProjectStage';

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

export function buildCanvasRelationalTreeRelation(
  args: Readonly<{
    index: SubstraitRelationIndex;
    digest: string;
    publication?: ReadonlyMap<string, RelationPublication>;
  }>
): CanvasRelationalTreeNode {
  const { index, digest } = args;
  const entries = index.postorder
    .map((id) => index.relations.get(id)!)
    .filter((entry) => entry.binding.authoringOwnerRelationId == null);
  const visibleInputs = new Map(
    entries.map((entry) => {
      const group = readSubstraitAuthoringGroup(index, entry.binding.relationId);
      return [entry.binding.relationId, group == null ? entry.inputs : [group.inputId]];
    })
  );
  const paths = new Map([[index.rootId, 'root']]);
  const children = new Map<string, ReturnType<typeof childInputs>>();
  for (let ordinal = entries.length - 1; ordinal >= 0; ordinal -= 1) {
    const entry = entries[ordinal]!;
    const id = entry.binding.relationId;
    const inputs = childInputs(entry.relation);
    children.set(id, inputs);
    inputs.forEach((input, position) =>
      paths.set(
        visibleInputs.get(id)![position]!,
        `${paths.get(id)}/${input.role}:${input.ordinal}`
      )
    );
  }
  const nodes = new Map<string, CanvasRelationalTreeNode>();
  for (const entry of entries) {
    const id = entry.binding.relationId;
    const rel = entry.relation;
    const group = readSubstraitAuthoringGroup(index, id);
    const validity = args.publication?.get(id);
    const unavailable = new Set(validity?.unavailableFieldIds);
    const fields = fieldsForRelation(index, id);
    const projectStage = projectCanvasRelationalProjectStage(
      entry,
      index,
      new Set(
        fields
          .filter((field) => !unavailable.has(field.fieldId))
          .map((field) => field.outputOrdinal)
      )
    );
    const windows = projectStage?.summary.windowFieldCount ?? 0;
    nodes.set(id, {
      locator: `rel:${digest}:${paths.get(id)}`,
      operator: operator(rel),
      substraitKind: rel.relType.case ?? 'unknown',
      operation: projectStage?.operation ?? canvasPresentationOperationForRel(rel),
      relationId: id,
      displayName: sortFetchSummary(rel, index) ?? entry.binding.displayName ?? null,
      sourceRef: entry.binding.sourceRef ?? null,
      ...physicalReadPresentation(entry),
      output: { fields: fields.filter((field) => !unavailable.has(field.fieldId)) },
      unavailableFields: fields.filter((field) => unavailable.has(field.fieldId)),
      rowUnavailable: validity?.rowUnavailable ?? false,
      expressionRefs:
        group == null
          ? relationExpressionRefs(rel)
          : group.members.flatMap((member) =>
              relationExpressionRefs(member.relation).map((reference) => ({
                ...reference,
                relationId: member.binding.relationId,
              }))
            ),
      ...(projectStage == null ? {} : { projectionSummary: projectStage.summary }),
      decorations: windows === 0 ? [] : [{ kind: 'window', count: windows }],
      children: children.get(id)!.map((input, position) => ({
        role: input.role,
        ordinal: input.ordinal,
        node: nodes.get(visibleInputs.get(id)![position]!)!,
      })),
    });
  }
  return nodes.get(index.rootId)!;
}
