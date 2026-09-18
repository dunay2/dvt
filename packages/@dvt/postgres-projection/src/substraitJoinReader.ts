/** Owns projection of a canonical N-input JOIN tree to its verified read model. */
import { DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION } from '@dvt/contracts';

import type { DvtSubstraitJoinPredicateCondition } from './substraitJoinCondition.js';
import {
  mapDvtSubstraitJoinConditionOperands,
  collectDvtSubstraitJoinConditionComparisons,
  isDvtSubstraitJoinNullCondition,
  compactDvtSubstraitJoinConditionDefaults,
} from './substraitJoinCondition.js';
import {
  hasSameConnectionRef,
  joinDataType,
  namedTableIdentity,
  hasPinnedPlanVersion,
  hasUniqueInnerJoinSidecarIdentity,
  hasCurrentInnerJoinSemanticHash,
  inspectNInputJoinNode,
  flattenNInputJoinTree,
} from './substraitJoinInspectionGuards.js';
import type { DvtSubstraitJoinPredicateOperand } from './substraitJoinOperandReader.js';
import {
  mapDvtSubstraitJoinOperandFields,
  resolveDvtSubstraitJoinOperandDataType,
} from './substraitJoinOperandReader.js';
import type {
  DvtSubstraitJoinDataType,
  DvtSubstraitInnerJoinDraft,
  DvtSubstraitNInputJoinProjection,
  DvtSubstraitNInputJoinInspection,
  DvtSubstraitJoinPredicate,
  JoinOriginField,
  InspectedJoinStage,
  InspectedJoinStructure,
  InspectedJoinPredicateOperand,
} from './substraitJoinReadModel.js';

export function inspectNInputJoinStructure(
  draft: DvtSubstraitInnerJoinDraft
): InspectedJoinStructure | null {
  const { plan, sidecar } = draft;
  if (
    !hasPinnedPlanVersion(plan) ||
    plan.relations.length !== 1 ||
    sidecar.schemaVersion !== DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION ||
    !hasUniqueInnerJoinSidecarIdentity(draft) ||
    !hasCurrentInnerJoinSemanticHash(draft)
  ) {
    return null;
  }
  const root = plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.input == null ||
    root.value.names.some((name) => name.length === 0) ||
    new Set(root.value.names).size !== root.value.names.length
  ) {
    return null;
  }
  const tree = flattenNInputJoinTree(root.value.input);
  if (
    tree == null ||
    tree.reads.length < 2 ||
    tree.joins.length !== tree.reads.length - 1 ||
    sidecar.relations.length !== tree.reads.length + tree.joins.length
  ) {
    return null;
  }

  const inputs: DvtSubstraitNInputJoinProjection['inputs'][number][] = [];
  for (const [index, readRel] of tree.reads.entries()) {
    if (readRel.relType.case !== 'read' || readRel.relType.value.common?.relAnchor !== index + 1) {
      return null;
    }
    const table = namedTableIdentity(readRel);
    const fieldNames = readRel.relType.value.baseSchema?.names;
    const fieldTypes = readRel.relType.value.baseSchema?.struct?.types;
    const dataTypes = fieldTypes?.map(joinDataType);
    const binding = sidecar.relations.find((relation) => relation.relAnchor === index + 1);
    if (
      table == null ||
      fieldNames == null ||
      fieldNames.length === 0 ||
      fieldNames.some((name) => name.length === 0 || name !== name.trim()) ||
      new Set(fieldNames).size !== fieldNames.length ||
      fieldTypes == null ||
      fieldTypes.length !== fieldNames.length ||
      dataTypes == null ||
      dataTypes.some((dataType) => dataType == null) ||
      binding == null ||
      binding.sourceRef == null ||
      binding.displayName !== table.table
    ) {
      return null;
    }
    const fields = sidecar.fields
      .filter((field) => field.relationId === binding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    if (
      fields.length !== fieldNames.length ||
      fields.some(
        (field, fieldIndex) =>
          field.outputOrdinal !== fieldIndex || field.displayName !== fieldNames[fieldIndex]
      )
    ) {
      return null;
    }
    inputs.push({
      relationId: binding.relationId,
      ...table,
      sourceRef: binding.sourceRef,
      fields: fields.map((field, fieldIndex) => ({
        name: fieldNames[fieldIndex]!,
        fieldId: field.fieldId,
        dataType: dataTypes[fieldIndex]!,
      })),
    });
  }
  if (
    new Set(
      inputs.map(
        (input) => `${input.sourceRef.connectionRef.connectionId}:${input.sourceRef.sourceObjectId}`
      )
    ).size !== inputs.length ||
    inputs.some(
      (input) =>
        input.sourceRef.connectionRef.provider !== 'postgres' ||
        !hasSameConnectionRef(inputs[0]!.sourceRef.connectionRef, input.sourceRef.connectionRef)
    )
  ) {
    return null;
  }

  let workingFields = inputs[0]!.fields.map<JoinOriginField>((field) => ({
    inputIndex: 0,
    name: field.name,
    fieldId: field.fieldId,
    dataType: field.dataType,
  }));
  const joins: DvtSubstraitJoinPredicate[] = [];
  const stages: InspectedJoinStage[] = [];
  let outputs: DvtSubstraitNInputJoinProjection['outputs'][number][] = [];
  for (const [joinIndex, joinRel] of tree.joins.entries()) {
    const relAnchor = inputs.length + joinIndex + 1;
    const inspectedJoin = inspectNInputJoinNode(plan, joinRel, relAnchor);
    const rightInput = inputs[joinIndex + 1]!;
    const rightFields = rightInput.fields.map<JoinOriginField>((field) => ({
      inputIndex: joinIndex + 1,
      name: field.name,
      fieldId: field.fieldId,
      dataType: field.dataType,
    }));
    const available = [...workingFields, ...rightFields];
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
      (inspectedJoin.outputMapping.length === 0 && joinIndex !== tree.joins.length - 1) ||
      new Set(inspectedJoin.outputMapping).size !== inspectedJoin.outputMapping.length ||
      inspectedJoin.outputMapping.some((ordinal) => ordinal < 0 || ordinal >= available.length)
    ) {
      return null;
    }
    const conditions: DvtSubstraitJoinPredicateCondition[] = [];
    const convertOperand = (
      operand: InspectedJoinPredicateOperand
    ): DvtSubstraitJoinPredicateOperand | null => {
      return mapDvtSubstraitJoinOperandFields(operand, (field) => {
        const origin = available[field.ordinal];
        return origin == null ? null : { kind: 'field', sourceFieldId: origin.fieldId };
      });
    };
    for (const condition of inspectedJoin.conditions) {
      const converted = mapDvtSubstraitJoinConditionOperands(condition, convertOperand);
      if (converted == null) return null;
      const operandType = (
        operand: DvtSubstraitJoinPredicateOperand
      ): DvtSubstraitJoinDataType | null =>
        resolveDvtSubstraitJoinOperandDataType(
          operand,
          (field) =>
            available.find((candidate) => candidate.fieldId === field.sourceFieldId)?.dataType ??
            null
        );
      for (const comparison of collectDvtSubstraitJoinConditionComparisons(converted)) {
        if (
          operandType(comparison.left) == null ||
          (!isDvtSubstraitJoinNullCondition(comparison) &&
            operandType(comparison.left) !== operandType(comparison.right))
        ) {
          return null;
        }
      }
      conditions.push(compactDvtSubstraitJoinConditionDefaults(converted));
    }
    const nextFields = inspectedJoin.outputMapping.map((ordinal) => available[ordinal]!);
    const stageFields = sidecar.fields
      .filter((field) => field.relationId === relationBinding.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
    const finalStage = joinIndex === tree.joins.length - 1;
    const names = finalStage ? root.value.names : stageFields.map((field) => field.displayName);
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

export function inspectDvtSubstraitNInputJoinDraft(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitNInputJoinInspection {
  const structure = inspectNInputJoinStructure(draft);
  return structure == null
    ? { ok: false }
    : {
        ok: true,
        projection: {
          inputs: structure.inputs,
          joinRelations: structure.stages.map((stage) => ({
            relationId: stage.relationId,
            relAnchor: stage.relAnchor,
          })),
          joins: structure.joins,
          outputs: structure.outputs,
        },
      };
}
