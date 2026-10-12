/** Author FilterRel over an exact typed input, independently of the consumer's operator. */
import { create, clone } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import {
  cloneLocalRelation,
  SubstraitAnalysisError,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import {
  prepareSelectedRelationUnary,
  commitSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';

export type SelectedFilterRequest = SelectedUnaryRequest &
  Readonly<{
    fieldId: string;
    capabilityId: string;
    value: string;
  }>;

export async function applySelectedRelationFilter(
  session: CanvasRelationAnalysisSession,
  request: SelectedFilterRequest
): Promise<SubstraitDocument> {
  const prepared = await prepareSelectedRelationUnary(session, request, 'filter');
  const { target, input, schema, binding } = prepared;
  const field = schema.bindings.find(
    (item) => item.fieldId === request.fieldId && item.parentFieldId == null
  );
  const capability = dvtSubstraitTextComparison.capabilities.find(
    (item) => item.capabilityId === request.capabilityId
  );
  const admitted = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
    (entry) => entry.entryId === request.capabilityId && entry.profileStatus === 'supported-profile'
  );
  if (
    field == null ||
    capability == null ||
    !admitted ||
    schema.fields[field.outputOrdinal]?.type.kind.case !== 'string'
  )
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Filter field or comparison is outside the selected input scope.',
      input.binding.relationId
    );
  const plan = clone(PlanSchema, { ...target.plan, relations: [] });
  const condition = dvtSubstraitTextComparison.create(
    plan,
    capability.operator,
    field.outputOrdinal,
    request.value
  );
  const relation =
    request.intent === 'edit'
      ? cloneLocalRelation(target.relation, [input.relation])
      : create(RelSchema, {
          relType: {
            case: 'filter',
            value: {
              common: { relAnchor: binding.relAnchor },
              input: input.relation,
              condition,
            },
          },
        });
  if (relation.relType.case === 'filter') relation.relType.value.condition = condition;
  return commitSelectedRelationUnary(session, prepared, relation, plan);
}
