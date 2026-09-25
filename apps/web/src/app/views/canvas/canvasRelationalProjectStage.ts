/** Project emitted ProjectRel fields into a disposable field-transformation summary. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { SubstraitRelationIndex } from '@dvt/substrait-analysis';

import type { CanvasPresentationOperation } from './canvasRelationalOperationPresentation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

export type CanvasRelationalProjectStage = Readonly<{
  operation: Extract<CanvasPresentationOperation, 'field_transform'>;
  summary: NonNullable<CanvasRelationalTreeNode['projectionSummary']>;
}>;

export function projectCanvasRelationalProjectStage(
  rel: Rel,
  index: SubstraitRelationIndex,
  inputRelationIds: readonly string[]
): CanvasRelationalProjectStage | null {
  if (rel.relType.case !== 'project') return null;
  const inputFieldCount =
    inputRelationIds[0] == null
      ? 0
      : (index.relations.get(inputRelationIds[0])?.fields.length ?? 0);
  const project = rel.relType.value;
  const availableFieldCount = inputFieldCount + project.expressions.length;
  const emitted =
    project.common?.emitKind.case === 'emit'
      ? project.common.emitKind.value.outputMapping
      : Array.from({ length: availableFieldCount }, (_, ordinal) => ordinal);
  if (emitted.some((ordinal) => ordinal < 0 || ordinal >= availableFieldCount)) {
    throw new Error('ProjectRel emits an unavailable field.');
  }
  const expressions = emitted
    .filter((ordinal) => ordinal >= inputFieldCount)
    .map((ordinal) => project.expressions[ordinal - inputFieldCount]!);
  const scalarFieldCount = expressions.filter(
    (expression) => expression.rexType.case !== 'windowFunction'
  ).length;
  const windowFieldCount = expressions.length - scalarFieldCount;
  return {
    operation: 'field_transform',
    summary: {
      passthroughFieldCount: emitted.filter((ordinal) => ordinal < inputFieldCount).length,
      scalarFieldCount,
      windowFieldCount,
    },
  };
}
