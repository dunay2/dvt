/** Inspect chained ProjectRel inputs using the canonical recursive projection inspector. */
import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import {
  ReadRelSchema,
  ReadRel_NamedTableSchema,
  RelCommonSchema,
  RelSchema,
  type Expression,
  type ProjectRel,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  NamedStructSchema,
  Type_StructSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import type {
  DvtSubstraitProjectionDraft,
  DvtSubstraitProjectionInspection,
} from './canvasDvtSubstraitProjection';
import {
  createProjectionType,
  projectHasOnlyFieldSelection,
  sortedRelationFields,
} from './canvasDvtSubstraitProjectionStructure';

export function inspectChainedDvtSubstraitProjectionDraft(
  draft: DvtSubstraitProjectionDraft,
  root: Extract<Plan['relations'][number]['relType'], { case: 'root' }>['value'],
  project: ProjectRel,
  inspectProjection: (draft: DvtSubstraitProjectionDraft) => DvtSubstraitProjectionInspection
): DvtSubstraitProjectionInspection {
  const inputProject = project.input?.relType;
  const inputAnchor =
    inputProject?.case === 'project' ? inputProject.value.common?.relAnchor : undefined;
  const targetAnchor = project.common?.relAnchor;
  if (
    inputProject?.case !== 'project' ||
    inputAnchor == null ||
    targetAnchor == null ||
    inputAnchor === targetAnchor ||
    !projectHasOnlyFieldSelection(project)
  ) {
    return { ok: false };
  }
  const inputBindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === inputAnchor
  );
  const targetBindings = draft.sidecar.relations.filter(
    (relation) => relation.relAnchor === targetAnchor
  );
  const inputBinding = inputBindings.length === 1 ? inputBindings[0] : null;
  const targetBinding = targetBindings.length === 1 ? targetBindings[0] : null;
  if (
    inputBinding == null ||
    inputBinding.sourceRef != null ||
    targetBinding == null ||
    targetBinding.sourceRef != null ||
    inputBinding.relationId === targetBinding.relationId ||
    new Set(draft.sidecar.relations.map((relation) => relation.relationId)).size !==
      draft.sidecar.relations.length ||
    new Set(draft.sidecar.fields.map((field) => field.fieldId)).size !== draft.sidecar.fields.length
  ) {
    return { ok: false };
  }
  const inputFields = sortedRelationFields(draft.sidecar, inputBinding.relationId);
  const targetFields = sortedRelationFields(draft.sidecar, targetBinding.relationId);
  const mappings = project.common?.emitKind;
  if (
    mappings?.case !== 'emit' ||
    inputFields.length === 0 ||
    targetFields.length !== root.names.length ||
    mappings.value.outputMapping.length !== targetFields.length ||
    inputFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.displayName == null || field.parentFieldId != null
    ) ||
    targetFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.displayName !== root.names[ordinal]
    )
  ) {
    return { ok: false };
  }

  const upstreamPlan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
  const upstreamRoot = upstreamPlan.relations[0]?.relType;
  if (upstreamRoot?.case !== 'root') return { ok: false };
  upstreamRoot.value.input = project.input;
  upstreamRoot.value.names = inputFields.map((field) => field.displayName!);
  const upstreamFunctionAnchors = new Set<number>();
  const collectExpressionFunctionAnchors = (expression: Expression): void => {
    if (expression.rexType.case !== 'scalarFunction') return;
    upstreamFunctionAnchors.add(expression.rexType.value.functionReference);
    expression.rexType.value.arguments.forEach((argument) => {
      if (argument.argType.case === 'value')
        collectExpressionFunctionAnchors(argument.argType.value);
    });
  };
  const collectRelationFunctionAnchors = (relation: Rel | undefined): void => {
    if (relation?.relType.case !== 'project') return;
    relation.relType.value.expressions.forEach(collectExpressionFunctionAnchors);
    collectRelationFunctionAnchors(relation.relType.value.input);
  };
  collectRelationFunctionAnchors(upstreamRoot.value.input);
  upstreamPlan.extensions = upstreamPlan.extensions.filter(
    (entry) =>
      entry.mappingType.case !== 'extensionFunction' ||
      upstreamFunctionAnchors.has(entry.mappingType.value.functionAnchor)
  );
  const upstreamUrnAnchors = new Set(
    upstreamPlan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  upstreamPlan.extensionUrns = upstreamPlan.extensionUrns.filter((entry) =>
    upstreamUrnAnchors.has(entry.extensionUrnAnchor)
  );
  const upstreamDraft: DvtSubstraitProjectionDraft = {
    plan: upstreamPlan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== targetBinding.relationId
      ),
      fields: draft.sidecar.fields.filter((field) => field.relationId !== targetBinding.relationId),
    },
  };
  const upstreamInspection = inspectProjection(upstreamDraft);
  if (
    !upstreamInspection.ok ||
    upstreamInspection.projection.targetRelationId !== inputBinding.relationId ||
    upstreamInspection.projection.outputs.length !== inputFields.length ||
    upstreamInspection.projection.outputs.some((output, ordinal) => {
      const field = inputFields[ordinal];
      return (
        field == null ||
        output.fieldId !== field.fieldId ||
        output.name !== field.displayName ||
        output.outputOrdinal !== field.outputOrdinal
      );
    })
  ) {
    return { ok: false };
  }

  if (project.expressions.length > 0) {
    const validationPlan = fromBinary(PlanSchema, toBinary(PlanSchema, draft.plan));
    const validationRoot = validationPlan.relations[0]?.relType;
    const validationProject =
      validationRoot?.case === 'root' ? validationRoot.value.input?.relType : undefined;
    if (validationRoot?.case !== 'root' || validationProject?.case !== 'project') {
      return { ok: false };
    }
    validationProject.value.input = create(RelSchema, {
      relType: {
        case: 'read',
        value: create(ReadRelSchema, {
          common: create(RelCommonSchema, { relAnchor: inputAnchor }),
          baseSchema: create(NamedStructSchema, {
            names: inputFields.map((field) => field.displayName!),
            struct: create(Type_StructSchema, {
              types: upstreamInspection.projection.outputs.map((output) =>
                createProjectionType(output.dataType)
              ),
              nullability: Type_Nullability.REQUIRED,
            }),
          }),
          readType: {
            case: 'namedTable',
            value: create(ReadRel_NamedTableSchema, {
              names: [
                upstreamInspection.projection.source.schema,
                upstreamInspection.projection.source.table,
              ],
            }),
          },
        }),
      },
    });
    const validationInspection = inspectProjection({
      plan: validationPlan,
      sidecar: {
        ...draft.sidecar,
        relations: [
          { ...inputBinding, sourceRef: upstreamInspection.projection.source.sourceRef },
          targetBinding,
        ],
        fields: draft.sidecar.fields.filter(
          (field) =>
            field.relationId === inputBinding.relationId ||
            field.relationId === targetBinding.relationId
        ),
      },
    });
    if (!validationInspection.ok) return { ok: false };
    const actualTypeByFieldId = new Map(
      upstreamInspection.projection.outputs.map(
        (output) => [output.fieldId, output.dataType] as const
      )
    );
    return {
      ok: true,
      projection: {
        ...validationInspection.projection,
        source: upstreamInspection.projection.source,
        inputProjection: upstreamInspection.projection,
        inputRelationId: inputBinding.relationId,
        inputFields: inputFields.map((field, ordinal) => ({
          fieldId: field.fieldId,
          name: field.displayName!,
          dataType: upstreamInspection.projection.outputs[ordinal]!.dataType,
        })),
        targetRelationId: targetBinding.relationId,
        outputs: validationInspection.projection.outputs.map((output) => ({
          ...output,
          ...(output.sourceFieldId == null ||
          output.calculation != null ||
          output.scalarExpression != null
            ? {}
            : { dataType: actualTypeByFieldId.get(output.sourceFieldId) ?? output.dataType }),
        })),
      },
    };
  }
  const outputs = mappings.value.outputMapping.map((sourceOrdinal, outputOrdinal) => {
    const sourceField = inputFields[sourceOrdinal];
    const sourceOutput = upstreamInspection.projection.outputs[sourceOrdinal];
    const targetField = targetFields[outputOrdinal];
    if (
      sourceField == null ||
      sourceOutput == null ||
      targetField == null ||
      targetField.sourceFieldId !== sourceField.fieldId
    ) {
      return null;
    }
    return {
      fieldId: targetField.fieldId,
      name: targetField.displayName!,
      sourceFieldId: sourceField.fieldId,
      sourceFieldName: sourceField.displayName!,
      dataType: sourceOutput.dataType,
      outputOrdinal,
      ...(targetField.description == null ? {} : { description: targetField.description }),
    };
  });
  if (outputs.some((output) => output == null)) return { ok: false };

  return {
    ok: true,
    projection: {
      source: upstreamInspection.projection.source,
      inputProjection: upstreamInspection.projection,
      inputRelationId: inputBinding.relationId,
      inputFields: inputFields.map((field, ordinal) => ({
        fieldId: field.fieldId,
        name: field.displayName!,
        dataType: upstreamInspection.projection.outputs[ordinal]!.dataType,
      })),
      targetRelationId: targetBinding.relationId,
      outputs: outputs.filter((output) => output != null),
    },
  };
}
