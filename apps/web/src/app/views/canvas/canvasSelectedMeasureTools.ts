import { countFunction, rowNumberFunction } from './canvasMeasureFunctions';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
/** Presentation of selected aggregate/window messages; inputs come from shared analysis. */
import type { SelectedRelationInput } from './useSelectedRelationInput';
import type { CanvasRelationalOperatorTool } from './relational-operator-form/OperatorTool';
import { relationOutputField } from './canvasRelationOutputBindings';

export function selectedInputFields(input: SelectedRelationInput) {
  return input.schema.bindings
    .filter((field) => field.parentFieldId == null)
    .map((field) => ({
      fieldId: field.fieldId,
      name: field.displayName ?? field.fieldId,
      dataType: input.schema.fields[field.outputOrdinal]?.type.kind.case,
      ordinal: field.outputOrdinal,
    }));
}

export function aggregateTool(input: SelectedRelationInput): CanvasRelationalOperatorTool {
  const fields = selectedInputFields(input);
  const message = input.target.relation.relType;
  const aggregate = input.intent === 'edit' && message.case === 'aggregate' ? message.value : null;
  const ordinal = dvtSubstraitExpression.fieldOrdinal(aggregate?.groupingExpressions[0]);
  return {
    id: 'aggregate',
    active: input.intent === 'edit',
    fields,
    enabled:
      fields.length > 0 &&
      (input.intent === 'insert' ||
        (aggregate != null &&
          aggregate.groupingExpressions.length === 1 &&
          aggregate.measures.length === 1 &&
          countFunction.matches(input.target.plan, aggregate) &&
          ordinal != null)),
    fieldId: fields.find((field) => field.ordinal === ordinal)?.fieldId,
    alias:
      aggregate == null
        ? undefined
        : relationOutputField(input.target.relation, input.target.fields, 1, 2)?.displayName,
  };
}

export function windowTool(input: SelectedRelationInput): CanvasRelationalOperatorTool {
  const fields = selectedInputFields(input);
  const message = input.target.relation.relType;
  const project = input.intent === 'edit' && message.case === 'project' ? message.value : null;
  const expression = project?.expressions[0]?.rexType;
  const window = expression?.case === 'windowFunction' ? expression.value : null;
  const ordinal = dvtSubstraitExpression.fieldOrdinal(window?.sorts[0]?.expr);
  const partitions =
    window?.partitions.map((expression) =>
      fields.find((field) => field.ordinal === dvtSubstraitExpression.fieldOrdinal(expression))
    ) ?? [];
  return {
    id: 'window',
    active: input.intent === 'edit',
    fields,
    enabled:
      fields.length > 0 &&
      (input.intent === 'insert' ||
        (project?.expressions.length === 1 &&
          window != null &&
          window.sorts.length === 1 &&
          partitions.every((field) => field != null) &&
          ordinal != null &&
          rowNumberFunction.matches(input.target.plan, window))),
    fieldId: fields.find((field) => field.ordinal === ordinal)?.fieldId,
    partitionFieldIds: partitions.flatMap((field) => (field == null ? [] : [field.fieldId])),
    alias:
      window == null
        ? undefined
        : relationOutputField(
            input.target.relation,
            input.target.fields,
            input.schema.fields.length,
            input.schema.fields.length + 1
          )?.displayName,
  };
}
