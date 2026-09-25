/** Read the nearest output-path Filter through the existing index and cached input schema. */
import type { CanvasPresentationAnalysisEntry } from './canvasPresentationAnalysis';
import { createSemanticExpressionDescription } from './semanticExpressionDescription';

export async function presentCanvasFilterSummary(
  entry: CanvasPresentationAnalysisEntry,
  signal?: AbortSignal
): Promise<string | undefined> {
  let relation = entry.index.relations.get(entry.index.rootId);
  while (relation?.inputs.length === 1) {
    signal?.throwIfAborted();
    const inputId = relation.inputs[0]!;
    const operation = relation.relation.relType;
    if (operation.case === 'filter') {
      if (operation.value.condition == null) return undefined;
      const input = await entry.session.query(inputId, signal);
      const names = new Map(
        input.bindings
          .filter((field) => field.parentFieldId == null)
          .map((field) => [field.outputOrdinal, field.displayName ?? field.fieldId])
      );
      return createSemanticExpressionDescription(entry.document.plan).describeExpression(
        operation.value.condition,
        input.fields.map((_, ordinal) => names.get(ordinal) ?? `field[${ordinal}]`)
      );
    }
    relation = entry.index.relations.get(inputId);
  }
  return undefined;
}
