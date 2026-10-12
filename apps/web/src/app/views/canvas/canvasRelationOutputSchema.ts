/**
 * Owned concern: present natural operator slots and selected outputs from canonical emit.
 * @baseline ADR-0064: canonical slots, not execution profiles, own output identity.
 * @decision Accept an explicit dependency model only to describe grouped calculations.
 * @consequence Presentation retains formulas without changing selection or lineage semantics.
 * @version 1.0.0
 */
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import {
  deriveOperatorSchema,
  type IndexedRelation,
  type RelationAnalysisResult,
  type SchemaField,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { relationOutputMapping } from './canvasRelationOutputBindings';
import { joinOutputScope } from './canvasSelectedJoinType';
import { createSemanticExpressionDescription } from './semanticExpressionDescription';
import type { TransformDependencyModel } from './canvasTransformDependencyModel';
import { describeCanvasTransformDefinitions } from './canvasTransformDefinitionPresentation';
import { rootFields } from './canvasDerivedOutputExpression';

type Fields = readonly DvtSubstraitFieldBindingV1[];
export type RelationOutputSlot = Readonly<{
  slot: number;
  key: string;
  name: string;
  expression?: string;
  schema: SchemaField;
  output: DvtSubstraitFieldBindingV1 | undefined;
  fields: Fields;
}>;

function inputOrigins(
  entry: IndexedRelation,
  inputs: readonly RelationAnalysisResult[]
): readonly Fields[] {
  const variant = entry.relation.relType;
  const roots = inputs.map((input) =>
    input.bindings
      .filter((field) => field.parentFieldId == null)
      .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
  );
  if (variant.case === 'set')
    return roots[0]!.map((_, slot) => roots.map((fields) => fields[slot]!));
  if (variant.case === 'aggregate') return [];
  const all = roots.flat().map((field) => [field]);
  return variant.case === 'join'
    ? joinOutputScope(
        variant.value.type,
        roots.map((fields) => fields.length)
      ).map((slot) => all[slot]!)
    : all;
}

export function relationOutputSlots(
  entry: IndexedRelation & Pick<SubstraitDocument, 'plan'>,
  inputs: readonly RelationAnalysisResult[],
  dependencies?: TransformDependencyModel
): readonly RelationOutputSlot[] {
  const natural = deriveOperatorSchema(
    entry,
    inputs.map((input) => input.fields)
  );
  const mapping = relationOutputMapping(entry.relation, natural.length);
  const origins = inputOrigins(entry, inputs);
  const inputNames = origins.map((fields) => fields[0]?.displayName ?? '');
  const describe = createSemanticExpressionDescription(entry.plan).describeExpression;
  const descriptions =
    dependencies == null ? null : describeCanvasTransformDefinitions(entry.plan, dependencies);
  const symbols =
    dependencies == null
      ? []
      : [
          ...(dependencies.memberOutputIds.get(entry.inputs[0]!) ??
            rootFields(dependencies.input.fields).map((field) => field.fieldId)),
          ...dependencies.definitions
            .filter(
              (definition) => definition.owner.binding.relationId === entry.binding.relationId
            )
            .map((definition) => definition.id),
        ];
  const fieldsById = new Map(
    [...inputs.flatMap((input) => input.bindings), ...entry.fields].map((field) => [
      field.fieldId,
      field,
    ])
  );
  const names = new Set(
    entry.fields.filter((field) => field.parentFieldId == null).map((field) => field.displayName)
  );
  return natural.map((schema, slot) => {
    const output = entry.fields.find(
      (field) => field.parentFieldId == null && field.outputOrdinal === mapping.indexOf(slot)
    );
    const source = origins[slot] ?? [];
    const key = output?.fieldId ?? source[0]?.fieldId ?? `${entry.binding.relationId}:slot:${slot}`;
    const base = output?.displayName ?? source[0]?.displayName ?? `expression_${slot + 1}`;
    let name = base;
    if (output == null) {
      let suffix = 2;
      while (names.has(name)) name = `${base}_${suffix++}`;
      names.add(name);
    }
    const fields: DvtSubstraitFieldBindingV1[] = [];
    const append = (
      value: SchemaField,
      path: number[],
      prior?: DvtSubstraitFieldBindingV1,
      parentFieldId?: string
    ) => {
      const fieldId = path.length === 0 ? key : `${key}:${path.join('.')}`;
      const origin = path.length === 0 ? source : [];
      const dependencies =
        origin.length > 0 ? origin.map((field) => field.fieldId) : value.sourceFieldIds;
      fields.push({
        fieldId,
        relationId: entry.binding.relationId,
        outputOrdinal: path.at(-1) ?? slot,
        displayName:
          prior?.displayName ??
          (path.length === 0
            ? name
            : (fieldsById.get(value.sourceFieldIds[0] ?? '')?.displayName ??
              `field_${path.at(-1)! + 1}`)),
        ...(parentFieldId == null ? {} : { parentFieldId }),
        ...(prior?.description == null ? {} : { description: prior.description }),
        ...(dependencies.length === 1
          ? { sourceFieldId: dependencies[0]! }
          : dependencies.length > 1
            ? { operandFieldIds: [...dependencies] }
            : {}),
      });
      value.children?.forEach((child, ordinal) =>
        append(
          child,
          [...path, ordinal],
          prior == null
            ? undefined
            : entry.fields.find(
                (field) => field.parentFieldId === prior.fieldId && field.outputOrdinal === ordinal
              ),
          fieldId
        )
      );
    };
    append(schema, [], output);
    const expression =
      entry.relation.relType.case === 'project'
        ? entry.relation.relType.value.expressions[slot - origins.length]
        : undefined;
    const description =
      descriptions?.get(symbols[slot]!)?.description ??
      (expression == null ? undefined : describe(expression, inputNames));
    return {
      slot,
      key,
      name,
      schema,
      output,
      fields,
      ...(description == null ? {} : { expression: description }),
    };
  });
}
