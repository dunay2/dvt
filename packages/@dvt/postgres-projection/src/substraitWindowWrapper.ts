/** Owned concern: inspect the bounded grouped ROW_NUMBER without changing input semantics. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone } from '@bufbuild/protobuf';

import type {
  InspectCompositionBase,
  RelationalGroupedComposition,
} from './relationalGroupedComposition.js';
import { removeFunction, sortedFields, withCurrentHash } from './relationalWrapperDraft.js';
import { inspectFunctionProfile } from './substrait-profile/functions.js';
import { rowNumberProfile } from './substrait-profile/rowNumber.js';
import { inspectAggregateWrapper } from './substraitAggregateWrapper.js';
import { dvtSubstraitExpressionReader } from './substraitExpressionReader.js';
import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';
export function inspectWindowWrapper(
  draft: DvtSubstraitJoinDraft,
  inspectBase: InspectCompositionBase
): RelationalGroupedComposition | null {
  const root = draft.plan.relations[0]?.relType;
  if (
    root?.case !== 'root' ||
    root.value.names.length !== 3 ||
    root.value.names.some((name) => name.length === 0 || name !== name.trim()) ||
    new Set(root.value.names).size !== 3 ||
    root.value.input?.relType.case !== 'project'
  ) {
    return null;
  }
  const project = root.value.input.relType.value;
  const projectAnchor = project.common?.relAnchor;
  const aggregateAnchor =
    project.input?.relType.case === 'aggregate'
      ? project.input.relType.value.common?.relAnchor
      : null;
  const expression = project.expressions[0]?.rexType;
  if (
    projectAnchor == null ||
    aggregateAnchor == null ||
    project.common?.emitKind.case !== 'emit' ||
    project.common.emitKind.value.outputMapping.join(',') !== '0,1,2' ||
    project.common.hint != null ||
    project.common.advancedExtension != null ||
    project.advancedExtension != null ||
    project.expressions.length !== 1 ||
    expression?.case !== 'windowFunction'
  ) {
    return null;
  }
  const window = expression.value;
  const profile = inspectFunctionProfile(draft.plan, window);
  const { fieldOrdinal } = dvtSubstraitExpressionReader;
  if (
    !profile.ok ||
    profile.value !== rowNumberProfile ||
    window.partitions.length !== 0 ||
    window.sorts.length !== 2 ||
    fieldOrdinal(window.sorts[0]?.expr) !== 1 ||
    window.sorts[0]?.sortKind.case !== 'direction' ||
    window.sorts[0].sortKind.value !== SortField_SortDirection.DESC_NULLS_LAST ||
    fieldOrdinal(window.sorts[1]?.expr) !== 0 ||
    window.sorts[1]?.sortKind.case !== 'direction' ||
    window.sorts[1].sortKind.value !== SortField_SortDirection.ASC_NULLS_LAST
  ) {
    return null;
  }
  const projectBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === projectAnchor
  );
  const aggregateBinding = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === aggregateAnchor
  );
  if (
    projectBinding == null ||
    aggregateBinding == null ||
    projectBinding.sourceRef != null ||
    projectBinding.displayName !== aggregateBinding.displayName
  ) {
    return null;
  }
  const wrapperFields = sortedFields(draft, projectBinding.relationId);
  const rowNumberField = wrapperFields[2];
  if (
    wrapperFields.length !== 3 ||
    wrapperFields.some(
      (field, outputOrdinal) =>
        field.outputOrdinal !== outputOrdinal ||
        field.displayName !== root.value.names[outputOrdinal]
    ) ||
    rowNumberField == null ||
    typeof rowNumberField.displayName !== 'string'
  ) {
    return null;
  }

  const plan = clone(PlanSchema, draft.plan);
  const aggregateRoot = plan.relations[0]?.relType;
  if (aggregateRoot?.case !== 'root' || aggregateRoot.value.input?.relType.case !== 'project') {
    return null;
  }
  const aggregateInput = aggregateRoot.value.input.relType.value.input;
  if (aggregateInput?.relType.case !== 'aggregate') return null;
  aggregateRoot.value.input = aggregateInput;
  aggregateRoot.value.names = aggregateRoot.value.names.slice(0, 2);
  removeFunction(plan, window.functionReference);
  const aggregateDraft = withCurrentHash({
    plan,
    sidecar: {
      ...draft.sidecar,
      relations: draft.sidecar.relations.filter(
        (relation) => relation.relationId !== projectBinding.relationId
      ),
      fields: draft.sidecar.fields.flatMap((field) => {
        if (field.fieldId === rowNumberField.fieldId) return [];
        return field.relationId === projectBinding.relationId
          ? [{ ...field, relationId: aggregateBinding.relationId }]
          : [field];
      }),
    },
  });
  const aggregate = inspectAggregateWrapper(aggregateDraft, inspectBase);
  if (
    aggregate == null ||
    wrapperFields[0]?.fieldId !== aggregate.outputs[0]?.fieldId ||
    wrapperFields[1]?.fieldId !== aggregate.outputs[1]?.fieldId ||
    draft.sidecar.relations.length !== aggregateDraft.sidecar.relations.length + 1 ||
    draft.sidecar.fields.length !== aggregateDraft.sidecar.fields.length + 1
  ) {
    return null;
  }
  return {
    ...aggregate,
    kind: 'window',
    windowName: rowNumberField.displayName,
    resultRelationId: projectBinding.relationId,
    outputs: [
      ...aggregate.outputs,
      {
        name: rowNumberField.displayName,
        fieldId: rowNumberField.fieldId,
        outputOrdinal: 2,
        dataType: 'i64',
        nullable: false,
      },
    ],
  };
}
