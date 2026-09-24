/** Display labels reference canonical expressions; they do not admit an operator or SQL dialect. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import type { CanvasPresentationAnalysisEntry } from './canvasPresentationAnalysis';

function expressionLabels(
  expression: Expression,
  functions: ReadonlyMap<number, string>
): string[] {
  const labels: string[] = [];
  const pending = [expression];
  while (pending.length > 0) {
    const rex = pending.pop()!.rexType;
    if (rex.case === 'scalarFunction' || rex.case === 'windowFunction') {
      const name = functions.get(rex.value.functionReference);
      if (name != null) labels.push(rex.case === 'windowFunction' ? name.toUpperCase() : name);
      pending.push(
        ...rex.value.arguments.flatMap((argument) =>
          argument.argType.case === 'value' ? [argument.argType.value] : []
        )
      );
    } else if (rex.case === 'literal') {
      const literal = rex.value.literalType;
      if (literal.case === 'string') labels.push(`LITERAL(${JSON.stringify(literal.value)})`);
      else if (literal.case === 'precisionTimestampTz')
        labels.push(
          `TIMESTAMP_TZ(${new Date(Number(literal.value.value) / 10 ** (literal.value.precision - 3)).toISOString()})`
        );
    }
  }
  return labels.reverse();
}

export async function presentFieldOperations(
  entry: CanvasPresentationAnalysisEntry,
  binding: DvtSubstraitFieldBindingV1,
  signal?: AbortSignal
): Promise<readonly string[]> {
  const functions = new Map(
    entry.document.plan.extensions.flatMap((extension) =>
      extension.mappingType.case === 'extensionFunction'
        ? [
            [
              extension.mappingType.value.functionAnchor,
              extension.mappingType.value.name.split(':')[0]!,
            ] as const,
          ]
        : []
    )
  );
  let current: DvtSubstraitFieldBindingV1 | undefined = binding;
  const visited = new Set<string>();
  while (current != null && !visited.has(current.fieldId)) {
    visited.add(current.fieldId);
    const relation = entry.index.relations.get(current.relationId)!;
    const rel = relation.relation.relType;
    if (rel.case === 'project' && current.parentFieldId == null) {
      const input = await entry.session.query(relation.inputs[0]!, signal);
      const emit = rel.value.common?.emitKind;
      const ordinal =
        emit?.case === 'emit'
          ? emit.value.outputMapping[current.outputOrdinal]!
          : current.outputOrdinal;
      const expression = rel.value.expressions[ordinal - input.fields.length];
      if (expression != null && expression.rexType.case !== 'selection')
        return expressionLabels(expression, functions);
    }
    current =
      current.sourceFieldId == null ? undefined : entry.index.fields.get(current.sourceFieldId);
  }
  return [];
}
