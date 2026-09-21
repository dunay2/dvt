/** Owned concern: inspect the bounded COUNT grouping over an admitted relational input. */
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone } from '@bufbuild/protobuf';

import type {
  InspectCompositionBase,
  RelationalGroupedComposition,
} from './relationalGroupedComposition.js';
import { removeFunction, sortedFields, withCurrentHash } from './relationalWrapperDraft.js';
import { countProfile } from './substrait-profile/count.js';
import { inspectFunctionProfile } from './substrait-profile/functions.js';
import { unsupportedProfile, type ProfileInspection } from './substrait-profile/inspection.js';
import { dvtSubstraitExpressionReader } from './substraitExpressionReader.js';
import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';
export function inspectAggregateWrapper(
  draft: DvtSubstraitJoinDraft,
  inspectBase: InspectCompositionBase
): ProfileInspection<RelationalGroupedComposition> {
  const root = draft.plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.names.length !== 2 ||
    root.value.names.some((name) => name.length === 0 || name !== name.trim()) ||
    new Set(root.value.names).size !== 2 ||
    root.value.input?.relType.case !== 'aggregate'
  ) {
    return unsupportedProfile('unsupported-aggregate-root');
  }
  const aggregate = root.value.input.relType.value;
  const measure = aggregate.measures[0];
  const aggregateAnchor = aggregate.common?.relAnchor;
  const inputAnchor =
    aggregate.input?.relType.case === 'set' || aggregate.input?.relType.case === 'join'
      ? aggregate.input.relType.value.common?.relAnchor
      : null;
  if (
    aggregateAnchor == null ||
    inputAnchor == null ||
    aggregate.common == null ||
    aggregate.common.emitKind.case !== undefined ||
    aggregate.common.hint != null ||
    aggregate.common.advancedExtension != null ||
    aggregate.advancedExtension != null ||
    aggregate.groupings.length !== 1 ||
    aggregate.groupings[0]?.expressionReferences.join(',') !== '0' ||
    aggregate.groupingExpressions.length !== 1 ||
    aggregate.measures.length !== 1 ||
    measure?.measure == null ||
    measure.filter != null
  ) {
    return unsupportedProfile('unsupported-aggregate-shape');
  }
  const profile = inspectFunctionProfile(draft.plan, measure.measure);
  if (!profile.ok) return profile;
  if (profile.value !== countProfile) return unsupportedProfile('unsupported-count-measure');
  const groupOrdinal = dvtSubstraitExpressionReader.fieldOrdinal(aggregate.groupingExpressions[0]);
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregateAnchor
  );
  const inputBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === inputAnchor
  );
  if (
    groupOrdinal == null ||
    groupOrdinal < 0 ||
    aggregateBinding == null ||
    inputBinding == null ||
    aggregateBinding.sourceRef != null ||
    aggregateBinding.displayName !== inputBinding.displayName
  ) {
    return unsupportedProfile('unsupported-aggregate-binding');
  }
  const wrapperFields = sortedFields(draft, aggregateBinding.relationId);
  const groupField = wrapperFields[0];
  const countField = wrapperFields[1];
  if (
    wrapperFields.length !== 2 ||
    groupField?.outputOrdinal !== 0 ||
    typeof groupField.displayName !== 'string' ||
    groupField.displayName !== root.value.names[0] ||
    countField?.outputOrdinal !== 1 ||
    typeof countField.displayName !== 'string' ||
    countField.displayName !== root.value.names[1]
  ) {
    return unsupportedProfile('unsupported-aggregate-fields');
  }

  const plan = clone(PlanSchema, draft.plan);
  const baseRoot = plan.relations[0]?.relType;
  if (baseRoot?.case !== 'root' || baseRoot.value.input?.relType.case !== 'aggregate')
    return unsupportedProfile('unsupported-aggregate-root');
  const baseInput = baseRoot.value.input.relType.value.input;
  if (baseInput?.relType.case !== 'set' && baseInput?.relType.case !== 'join')
    return unsupportedProfile('unsupported-aggregate-input');
  baseRoot.value.input = baseInput;
  removeFunction(plan, measure.measure.functionReference);
  const fields = draft.sidecar.fields.flatMap((field) => {
    if (field.fieldId === countField.fieldId) return [];
    return field.fieldId === groupField.fieldId
      ? [{ ...field, relationId: inputBinding.relationId, outputOrdinal: groupOrdinal }]
      : [field];
  });
  const baseResultFields = fields
    .filter((field) => field.relationId === inputBinding.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (
    baseResultFields.length === 0 ||
    baseResultFields.some(
      (field, outputOrdinal) => field.outputOrdinal !== outputOrdinal || field.displayName == null
    )
  ) {
    return unsupportedProfile('unsupported-aggregate-input-fields');
  }
  baseRoot.value.names = baseResultFields.map((field) => field.displayName!);
  const baseDraft = withCurrentHash({
    plan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== aggregateBinding.relationId
      ),
      fields,
    },
  });
  const base = inspectBase(baseDraft);
  const baseGroupField = base.ok ? base.projection.outputs[groupOrdinal] : null;
  if (
    !base.ok ||
    baseGroupField == null ||
    baseGroupField.fieldId !== groupField.fieldId ||
    draft.sidecar.relations.length !== baseDraft.sidecar.relations.length + 1 ||
    draft.sidecar.fields.length !== baseDraft.sidecar.fields.length + 1
  ) {
    return unsupportedProfile('unsupported-aggregate-base');
  }
  return {
    ok: true,
    value: {
      kind: 'aggregate',
      baseDraft,
      groupFieldName: baseGroupField.name,
      measureName: countField.displayName,
      resultRelationId: aggregateBinding.relationId,
      outputs: [
        { ...baseGroupField, name: groupField.displayName, outputOrdinal: 0 },
        {
          name: countField.displayName,
          fieldId: countField.fieldId,
          outputOrdinal: 1,
          dataType: 'i64',
          nullable: false,
        },
      ],
    },
  };
}
