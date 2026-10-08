/**
 * Owned concern: bind formula names to stable symbols in the selected Transform.
 * @baseline ADR-0064: input ordinals are canonical; labels are presentation, never identity.
 * @decision Share direct-passthrough name projection; retain genuine homonyms for rejection.
 * @consequence Aliases resolve to references rather than copied producer expressions.
 * @version 1.0.0
 */
import { deriveExpressionSchema, type SchemaField } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { TransformDependencyModel } from './canvasTransformDependencyModel';
import { rootFields, derivedOutputDataType } from './canvasDerivedOutputExpression';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import type { FormulaField } from './canvasDerivedOutputFormula';

export function projectTransformFormulaNameFields<T extends Pick<FormulaField, 'fieldId' | 'name'>>(
  model: TransformDependencyModel,
  fields: readonly T[]
): readonly T[] {
  const inputs = new Map(rootFields(model.input.fields).map((field) => [field.fieldId, field]));
  const forwarded = new Map<string, (typeof model.input.fields)[number]>();
  for (const definition of model.definitions) {
    const ordinal = dvtSubstraitExpression.fieldOrdinal(definition.expression);
    const input = ordinal == null ? undefined : inputs.get(definition.inputIds[ordinal]!);
    if (input == null) continue;
    forwarded.set(definition.id, input);
    if (definition.output != null) forwarded.set(definition.output.fieldId, input);
  }
  return fields.filter((field) => {
    const input = forwarded.get(field.fieldId);
    return (
      input == null ||
      input.displayName !== field.name ||
      !fields.some(
        (candidate) => candidate.fieldId === input.fieldId && candidate.name === field.name
      )
    );
  });
}

export async function readTransformFormulaScope(
  session: CanvasRelationAnalysisSession,
  model: TransformDependencyModel,
  signal?: AbortSignal
) {
  const input = await session.query(model.input.binding.relationId, signal);
  const base = rootFields(input.bindings);
  const symbols = [
    ...base.map((field) => field.fieldId),
    ...model.definitions.map((definition) => definition.id),
  ];
  const schemas = new Map<string, SchemaField>(
    base.map((field) => [field.fieldId, input.fields[field.outputOrdinal]!])
  );
  const aliases = new Map(base.map((field) => [field.fieldId, field.fieldId]));
  for (const definition of model.definitions) {
    schemas.set(
      definition.id,
      deriveExpressionSchema(
        definition.expression,
        definition.inputIds.map((id) => schemas.get(id)!)
      )
    );
    aliases.set(definition.binding.fieldId, definition.id);
  }
  const names = [
    ...base.map((field) => ({ field, symbol: field.fieldId })),
    ...model.definitions
      .filter((definition) => definition.output == null)
      .map((definition) => ({ field: definition.binding, symbol: definition.id })),
    ...rootFields(model.root.fields).map((field) => ({
      field,
      symbol: model.outputIds[field.outputOrdinal]!,
    })),
  ];
  const fields: FormulaField[] = [];
  for (const { field, symbol } of names) {
    aliases.set(field.fieldId, symbol);
    const schema = schemas.get(symbol)!;
    const dataType = derivedOutputDataType(schema.type);
    const name = field.displayName ?? field.fieldId;
    if (
      dataType == null ||
      !session.allowsInputSchema(schema) ||
      fields.some((item) => item.fieldId === symbol && item.name === name)
    )
      continue;
    fields.push({
      fieldId: symbol,
      name,
      dataType,
      expression: dvtSubstraitExpression.field(symbols.indexOf(symbol)),
    });
  }
  return {
    input,
    symbols,
    schemas,
    aliases,
    fields,
    formulaFields: projectTransformFormulaNameFields(model, fields),
  };
}
