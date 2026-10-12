/**
 * Owned concern: describe canonical Transform definitions through their logical input names.
 * @baseline ADR-0064: persisted expressions and explicit emit slots own calculated meaning.
 * @decision Share formula rendering across the authoring palette and output inspector.
 * @consequence Hidden and published aliases retain the same inspectable expression.
 * @version 1.0.0
 */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { rootFields } from './canvasDerivedOutputExpression';
import { describeDerivedOutputFormula } from './canvasDerivedOutputFormula';
import type { TransformDependencyModel } from './canvasTransformDependencyModel';
import { createSemanticExpressionDescription } from './semanticExpressionDescription';

export function describeCanvasTransformDefinitions(plan: Plan, model: TransformDependencyModel) {
  const names = new Map([
    ...rootFields(model.input.fields).map(
      (field) => [field.fieldId, field.displayName ?? ''] as const
    ),
    ...model.definitions.map(
      (definition) =>
        [
          definition.id,
          definition.output?.displayName ?? definition.binding.displayName ?? '',
        ] as const
    ),
  ]);
  const describe = createSemanticExpressionDescription(plan).describeExpression;
  return new Map(
    model.definitions.map((definition) => {
      const inputs = definition.inputIds.map((id) => names.get(id) ?? '');
      const formula = describeDerivedOutputFormula(plan, definition.expression, inputs);
      return [
        definition.id,
        {
          formula,
          description: formula ?? describe(definition.expression, inputs),
        },
      ] as const;
    })
  );
}
