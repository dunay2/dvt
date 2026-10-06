/**
 * Owned concern: read calculated definitions and their references from canonical Project relations.
 * @baseline ADR-0064: expression meaning belongs to Substrait, not a persisted formula graph.
 * @decision Follow explicit card ownership and emit slots; provenance is not a field reference.
 * @consequence This disposable read model supports both authoring and truthful presentation.
 * @version 1.0.0
 */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import type { IndexedRelation } from '@dvt/substrait-analysis';
import { rootFields } from './canvasDerivedOutputExpression';
import { relationOutputMapping } from './canvasRelationOutputBindings';

export type TransformDefinition = Readonly<{
  id: string;
  binding: DvtSubstraitFieldBindingV1;
  owner: IndexedRelation;
  ordinal: number;
  expression: Expression;
  inputIds: readonly string[];
  output?: DvtSubstraitFieldBindingV1;
}>;

export function readCanvasTransformDependencyModel(
  root: IndexedRelation,
  locate: (relationId: string) => IndexedRelation
) {
  const members = [root];
  let input = locate(root.inputs[0]!);
  while (input.binding.authoringOwnerRelationId === root.binding.relationId) {
    members.unshift(input);
    input = locate(input.inputs[0]!);
  }
  let symbols = rootFields(input.fields).map((field) => field.fieldId);
  const definitions: TransformDefinition[] = [];
  const memberOutputIds = new Map<string, readonly string[]>();
  for (const member of members) {
    if (member.relation.relType.case !== 'project') continue;
    const expressions = member.relation.relType.value.expressions;
    const mapping = relationOutputMapping(member.relation, symbols.length + expressions.length);
    const computed = expressions.map((expression, ordinal): TransformDefinition => {
      const outputOrdinal = mapping.indexOf(symbols.length + ordinal);
      const binding = rootFields(member.fields).find(
        (field) => field.outputOrdinal === outputOrdinal
      ) ?? {
        // A non-emitted legacy expression has a location, not a public authoring identity.
        fieldId: `${member.binding.relationId}:expression:${ordinal}`,
        relationId: member.binding.relationId,
        outputOrdinal,
      };
      return {
        id: binding.fieldId,
        binding,
        owner: member,
        ordinal,
        expression,
        inputIds: symbols,
      };
    });
    const natural = [...symbols, ...computed.map((definition) => definition.id)];
    definitions.push(...computed);
    symbols = mapping.map((ordinal) => natural[ordinal]!);
    memberOutputIds.set(member.binding.relationId, symbols);
  }
  const fields = rootFields(root.fields);
  return {
    root,
    input,
    members,
    memberOutputIds,
    outputIds: symbols,
    definitions: definitions.map((definition) => ({
      ...definition,
      output: fields.find((field) => symbols[field.outputOrdinal] === definition.id),
    })),
  };
}

export type TransformDependencyModel = ReturnType<typeof readCanvasTransformDependencyModel>;
