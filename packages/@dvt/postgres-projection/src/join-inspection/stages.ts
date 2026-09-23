/** Owns admitted JOIN stage propagation, nullability, emitted fields and lineage. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { inspectNInputJoinNode } from '../substraitJoinInspectionGuards.js';
import {
  dvtSubstraitJoinNullExtendsLeft,
  dvtSubstraitJoinNullExtendsRight,
  dvtSubstraitJoinRetainedSide,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitNInputJoinProjection,
  type DvtSubstraitJoinPredicate,
  type JoinOriginField,
  type InspectedJoinStage,
  type InspectedJoinStructure,
} from '../substraitJoinReadModel.js';

import { inspectJoinPredicates } from './predicates.js';

export function inspectJoinStages(
  draft: DvtSubstraitJoinDraft,
  rootNames: readonly string[],
  inputs: DvtSubstraitNInputJoinProjection['inputs'],
  joinRels: readonly Rel[]
): InspectedJoinStructure | null {
  const { plan, sidecar } = draft;
  let workingFields = inputs[0]!.fields.map<JoinOriginField>((field) => ({
    inputIndex: 0,
    name: field.name,
    fieldId: field.fieldId,
    dataType: field.dataType,
    nullable: field.nullable,
  }));
  const joins: DvtSubstraitJoinPredicate[] = [];
  const stages: InspectedJoinStage[] = [];
  let outputs: DvtSubstraitNInputJoinProjection['outputs'][number][] = [];
  for (const [joinIndex, joinRel] of joinRels.entries()) {
    if (joinRel.relType.case !== 'join') return null;
    const relAnchor = joinRel.relType.value.common?.relAnchor;
    if (relAnchor == null) return null;
    const inspectedJoin = inspectNInputJoinNode(plan, joinRel, relAnchor);
    const rightInput = inputs[joinIndex + 1]!;
    const leftFields = workingFields.map<JoinOriginField>((field) => ({
      ...field,
      nullable:
        inspectedJoin != null && dvtSubstraitJoinNullExtendsLeft(inspectedJoin.joinType)
          ? true
          : field.nullable,
    }));
    const rightFields = rightInput.fields.map<JoinOriginField>((field) => ({
      inputIndex: joinIndex + 1,
      name: field.name,
      fieldId: field.fieldId,
      dataType: field.dataType,
      nullable:
        inspectedJoin != null && dvtSubstraitJoinNullExtendsRight(inspectedJoin.joinType)
          ? true
          : field.nullable,
    }));
    const predicateFields = [...leftFields, ...rightFields];
    const retainedSide =
      inspectedJoin == null ? 'both' : dvtSubstraitJoinRetainedSide(inspectedJoin.joinType);
    const emittedFields =
      retainedSide === 'left'
        ? leftFields
        : retainedSide === 'right'
          ? rightFields
          : predicateFields;
    const relationBinding = sidecar.relations.find((relation) => relation.relAnchor === relAnchor);
    if (
      inspectedJoin == null ||
      relationBinding == null ||
      relationBinding.sourceRef != null ||
      relationBinding.displayName !==
        inputs
          .slice(0, joinIndex + 2)
          .map((input) => input.table)
          .join('+') ||
      (inspectedJoin.outputMapping.length === 0 && joinIndex !== joinRels.length - 1) ||
      new Set(inspectedJoin.outputMapping).size !== inspectedJoin.outputMapping.length ||
      inspectedJoin.outputMapping.some((ordinal) => ordinal < 0 || ordinal >= emittedFields.length)
    ) {
      return null;
    }
    const conditions = inspectJoinPredicates(inspectedJoin.conditions, predicateFields);
    if (conditions == null) return null;
    const nextFields = inspectedJoin.outputMapping.map((ordinal) => emittedFields[ordinal]!);
    const stageFields = sidecar.fields
      .filter((field) => field.relationId === relationBinding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    const finalStage = joinIndex === joinRels.length - 1;
    const names = finalStage ? rootNames : stageFields.map((field) => field.displayName);
    if (
      names.length !== nextFields.length ||
      stageFields.length !== nextFields.length ||
      stageFields.some((field, outputOrdinal) => {
        const name = names[outputOrdinal];
        const expectedOrigin = nextFields[outputOrdinal];
        return (
          name == null ||
          field.outputOrdinal !== outputOrdinal ||
          field.displayName !== name ||
          expectedOrigin == null ||
          (field.sourceFieldId != null && field.sourceFieldId !== expectedOrigin.fieldId)
        );
      })
    ) {
      return null;
    }
    stages.push({
      relationId: relationBinding.relationId,
      relAnchor,
      joinType: inspectedJoin.joinType,
      fields: stageFields.map((field, outputOrdinal) => ({
        fieldId: field.fieldId,
        displayName: names[outputOrdinal]!,
        sourceFieldId: nextFields[outputOrdinal]!.fieldId,
      })),
    });
    joins.push({ conditions });
    workingFields = nextFields;
    if (finalStage) {
      outputs = nextFields.map((origin, outputOrdinal) => ({
        name: names[outputOrdinal]!,
        fieldId: stageFields[outputOrdinal]!.fieldId,
        dataType: origin.dataType,
        nullable: origin.nullable,
        outputOrdinal,
        source: {
          inputIndex: origin.inputIndex,
          name: origin.name,
          fieldId: origin.fieldId,
        },
      }));
    }
  }
  return { inputs, stages, joins, outputs };
}
