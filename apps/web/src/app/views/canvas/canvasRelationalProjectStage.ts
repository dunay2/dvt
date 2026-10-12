/**
 * Owned concern: summarize published Transform definitions at the visible authoring boundary.
 * @baseline ADR-0064: canonical expressions and emit mappings own field meaning.
 * @decision Reuse the disposable dependency read model across explicitly owned stages.
 * @consequence Forwarding a calculation does not mislabel it as an input passthrough.
 * @version 1.0.0
 */
import {
  SubstraitAnalysisError,
  type IndexedRelation,
  type SubstraitRelationIndex,
} from '@dvt/substrait-analysis';

import type { CanvasPresentationOperation } from './canvasRelationalOperationPresentation';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';

export type CanvasRelationalProjectStage = Readonly<{
  operation: Extract<CanvasPresentationOperation, 'field_transform'>;
  summary: NonNullable<CanvasRelationalTreeNode['projectionSummary']>;
}>;

export function projectCanvasRelationalProjectStage(
  entry: IndexedRelation,
  index: SubstraitRelationIndex,
  availableOutputOrdinals?: ReadonlySet<number>
): CanvasRelationalProjectStage | null {
  if (entry.relation.relType.case !== 'project') return null;
  const model = readCanvasTransformDependencyModel(entry, (id) => index.relations.get(id)!);
  if (model.outputIds.some((id) => id == null))
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'ProjectRel emits an unavailable field.',
      entry.binding.relationId
    );
  const published = model.outputIds.filter(
    (_, ordinal) => availableOutputOrdinals == null || availableOutputOrdinals.has(ordinal)
  );
  const definitions = new Map(
    model.definitions.map((definition) => [definition.id, definition.expression])
  );
  const expressions = published.flatMap((id) => definitions.get(id) ?? []);
  const scalarFieldCount = expressions.filter(
    (expression) => expression.rexType.case !== 'windowFunction'
  ).length;
  const windowFieldCount = expressions.length - scalarFieldCount;
  return {
    operation: 'field_transform',
    summary: {
      passthroughFieldCount: published.length - expressions.length,
      scalarFieldCount,
      windowFieldCount,
    },
  };
}
