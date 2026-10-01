/** Project selected-relation fields and execution identity for scalar output authoring. */
import { useContext } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { derivedOutputDataType } from './canvasDerivedOutputExpression';
import { useCanvasRelationFields } from './useCanvasRelationFields';
import type { DerivedOutputField } from './canvasFormulaAssist';
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
          : [{ fieldId: field.fieldId, name: field.displayName ?? '', dataType }];
      });
    const available = [schema.result, input.result].flatMap((result) =>
      result.bindings
        .filter(
          (field) =>
            field.parentFieldId == null &&
            analysis.session.allowsInputSchema(result.fields[field.outputOrdinal]!)
        )
        .flatMap((field) => {
          const dataType = derivedOutputDataType(result.fields[field.outputOrdinal]!.type);
          return dataType == null || field.displayName == null
            ? []
            : [
                {
                  fieldId: field.fieldId,
                  relationId: field.relationId,
                  sourceFieldId: field.sourceFieldId,
                  name: field.displayName,
                  dataType,
                },
              ];
        })
    );
    const inputNames = input.result.bindings
      .filter((field) => field.parentFieldId == null)
      .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
      .map((field) => field.displayName ?? '');
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
    const operands = available.filter(
      (field, index) => available.findIndex((item) => item.name === field.name) === index
    );
    const references = available.filter((field) => {
      const operand = operands.find((item) => item.name === field.name)!;
      return operand.fieldId === field.fieldId || operand.sourceFieldId === field.fieldId;
    });
    return {
      fields: operands,
      dragScope: { rootId: analysis.session.rootId, revision: analysis.revision, references },
      outputs,
      intent: target.relation.relType.case === 'project' ? ('edit' as const) : ('insert' as const),
      provider: analysis.session.executionProvider(analysis.revision),
    };
  } catch {
    return null;
  }
}
