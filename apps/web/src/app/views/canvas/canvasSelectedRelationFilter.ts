/** Author FilterRel over an exact typed input, independently of the consumer's operator. */
import { create, clone } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
} from '@dvt/contracts';
import {
  cloneLocalRelation,
  SubstraitAnalysisError,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import {
  reconnectSelectedRelation,
  rebindSelectedFieldReferences,
} from './canvasSelectedRelationChange';

export type SelectedFilterRequest = Readonly<{
  intent: 'insert' | 'edit';
  relationId: string;
  expectedRevision: number;
  fieldId: string;
  capabilityId: string;
  value: string;
  signal?: AbortSignal;
}>;

export async function applySelectedRelationFilter(
  session: CanvasRelationAnalysisSession,
  request: SelectedFilterRequest
): Promise<SubstraitDocument> {
  const target = session.locate(request.relationId, request.expectedRevision);
  const editing = request.intent === 'edit';
  if (editing && target.relation.relType.case !== 'filter')
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'The selected relation is not a Filter.',
      request.relationId
    );
  const inputId = editing ? target.inputs[0]! : request.relationId;
  const schema = await session.query(inputId, request.signal);
  request.signal?.throwIfAborted();
  const input = session.locate(inputId, request.expectedRevision);
  const field = schema.bindings.find(
    (binding) => binding.fieldId === request.fieldId && binding.parentFieldId == null
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
      inputId
    );
  const plan = clone(PlanSchema, { ...target.plan, relations: [] });
  const condition = dvtSubstraitTextComparison.create(
    plan,
    capability.operator,
    field.outputOrdinal,
    request.value
  );
  const binding = editing
    ? target.binding
    : { relationId: allocateDvtRelationId(), relAnchor: target.nextAnchor, displayName: 'filter' };
  const relation = editing
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
  const fieldIds = new Map(schema.bindings.map((source) => [source.fieldId, allocateDvtFieldId()]));
  const fields = editing
    ? target.fields
    : schema.bindings.map((source) => ({
        fieldId: fieldIds.get(source.fieldId)!,
        relationId: binding.relationId,
        outputOrdinal: source.outputOrdinal,
        displayName: source.displayName,
        sourceFieldId: source.fieldId,
        ...(source.description == null ? {} : { description: source.description }),
        ...(source.parentFieldId == null
          ? {}
          : { parentFieldId: fieldIds.get(source.parentFieldId)! }),
      }));
  const reconnected = editing
    ? { upserts: [] }
    : reconnectSelectedRelation(
        session,
        request.relationId,
        relation,
        binding.relationId,
        request.expectedRevision
      );
  return session.apply({
    expectedRevision: request.expectedRevision,
    removed: [],
    ...reconnected,
    upserts: [{ relation, binding, fields }, ...reconnected.upserts],
    extensions: plan,
  });
}

export async function removeSelectedRelationFilter(
  session: CanvasRelationAnalysisSession,
  relationId: string,
  expectedRevision: number,
  signal?: AbortSignal
): Promise<SubstraitDocument> {
  const filter = session.locate(relationId, expectedRevision);
  if (filter.relation.relType.case !== 'filter')
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'The selected relation is not a Filter.',
      relationId
    );
  const inputId = filter.inputs[0]!;
  const schema = await session.query(inputId, signal);
  signal?.throwIfAborted();
  const input = session.locate(inputId, expectedRevision);
  const message = filter.relation.relType.value;
  if (message.advancedExtension != null || message.common?.advancedExtension != null)
    throw new SubstraitAnalysisError(
      'invalid_structure',
      'Cannot remove unknown Filter extensions.',
      relationId
    );
  const emit = message.common?.emitKind;
  if (
    emit?.case === 'emit' &&
    (emit.value.outputMapping.length !== schema.fields.length ||
      emit.value.outputMapping.some((ordinal, position) => ordinal !== position))
  ) {
    const relation = create(RelSchema, {
      relType: {
        case: 'project',
        value: {
          common: message.common,
          input: input.relation,
        },
      },
    });
    return session.apply({
      expectedRevision,
      removed: [],
      upserts: [
        {
          relation,
          binding: { ...filter.binding, displayName: 'project' },
          fields: filter.fields,
        },
      ],
    });
  }
  const reconnected = reconnectSelectedRelation(
    session,
    relationId,
    input.relation,
    inputId,
    expectedRevision
  );
  const replacements = new Map(
    filter.fields.map((field) => {
      const replacement =
        field.sourceFieldId ??
        input.fields.find((source) => source.outputOrdinal === field.outputOrdinal)?.fieldId;
      if (replacement == null)
        throw new SubstraitAnalysisError(
          'invalid_binding',
          'Filter output has no input identity.',
          relationId
        );
      return [field.fieldId, replacement];
    })
  );
  return session.apply({
    expectedRevision,
    removed: [relationId],
    ...reconnected,
    upserts: rebindSelectedFieldReferences(
      session,
      replacements,
      reconnected.upserts,
      expectedRevision
    ),
  });
}
