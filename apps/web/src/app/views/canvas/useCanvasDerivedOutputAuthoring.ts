/** Project selected-relation fields and execution identity for scalar output authoring. */
import { useContext } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { derivedOutputDataType } from './canvasDerivedOutputExpression';
import { useCanvasRelationFields } from './useCanvasRelationFields';
import type { DerivedOutputField } from './DerivedOutputOperands';
import { useSelectedRelation } from './useSelectedRelation';
import { describeDerivedOutputFormula } from './canvasDerivedOutputFormula';
import { relationOutputMapping } from './canvasRelationOutputBindings';

export function useCanvasDerivedOutputAuthoring(relationId: string) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const schema = useCanvasRelationFields(relationId);
  const selected = useSelectedRelation(relationId);
  const input = useCanvasRelationFields(selected?.inputs[0] ?? relationId);
  if (
    analysis?.document == null ||
    schema.result == null ||
    schema.error != null ||
    input.result == null
  )
    return null;
  try {
    const target = analysis.session.locate(relationId, analysis.revision);
    const fields = schema.result.bindings
      .filter(
        (field) =>
          field.parentFieldId == null &&
          analysis.session.allowsInputSchema(schema.result!.fields[field.outputOrdinal]!)
      )
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
      .flatMap((field): DerivedOutputField[] => {
        const dataType = derivedOutputDataType(schema.result!.fields[field.outputOrdinal]!.type);
        return dataType == null
          ? []
          : [{ fieldId: field.fieldId, name: field.displayName ?? field.fieldId, dataType }];
      });
    const inputNames = input.result.bindings
      .filter((field) => field.parentFieldId == null)
      .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
      .map((field) => field.displayName ?? field.fieldId);
    const project = target.relation.relType;
    const mapping =
      project.case === 'project'
        ? relationOutputMapping(
            target.relation,
            inputNames.length + project.value.expressions.length
          )
        : [];
    const outputs = fields.flatMap((field) => {
      const binding = schema.result!.bindings.find((item) => item.fieldId === field.fieldId)!;
      const slot = mapping[binding.outputOrdinal];
      if (project.case !== 'project' || slot == null || slot < inputNames.length) return [];
      const expression = project.value.expressions[slot - inputNames.length];
      return expression == null
        ? []
        : [
            {
              ...field,
              formula: describeDerivedOutputFormula(target.plan, expression, inputNames),
            },
          ];
    });
    return {
      fields,
      outputs,
      intent: target.relation.relType.case === 'project' ? ('edit' as const) : ('insert' as const),
      provider: analysis.session.executionProvider(analysis.revision),
    };
  } catch {
    return null;
  }
}
