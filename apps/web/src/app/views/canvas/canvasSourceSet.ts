/** Construct SetRel from typed occurrences, aligned by ordinal rather than table-specific names. */
import { create } from '@bufbuild/protobuf';
import {
  RelSchema,
  SetRel_SetOp,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_SPEC_VERSION,
} from '@dvt/contracts';
import { deriveSubstraitSchemas, type SubstraitDocument } from '@dvt/substrait-analysis';
import {
  hasSameConnectionRef,
  type DvtSubstraitJoinDataType,
  type DvtSubstraitSetOperation,
} from '@dvt/postgres-projection';
import { createSourceRelation, type ConnectedRelationSource } from './canvasSourceRelation';

export type SourceSetInput = ConnectedRelationSource &
  Readonly<{
    fields: readonly Readonly<{
      name: string;
      type: DvtSubstraitJoinDataType;
      nullable?: boolean;
    }>[];
  }>;

export const sourceSetOperations: Readonly<Record<DvtSubstraitSetOperation, SetRel_SetOp>> = {
  union_all: SetRel_SetOp.UNION_ALL,
  union_distinct: SetRel_SetOp.UNION_DISTINCT,
  intersect_distinct: SetRel_SetOp.INTERSECTION_MULTISET,
  except_distinct: SetRel_SetOp.MINUS_PRIMARY,
  intersect_all: SetRel_SetOp.INTERSECTION_MULTISET_ALL,
  except_all: SetRel_SetOp.MINUS_PRIMARY_ALL,
};

export function createSourceSet(
  args: Readonly<{
    inputs: readonly SourceSetInput[];
    targetNodeId: string;
    operation?: DvtSubstraitSetOperation;
  }>
): SubstraitDocument {
  const first = args.inputs[0];
  if (
    first == null ||
    args.inputs.length < 2 ||
    args.targetNodeId.trim() !== args.targetNodeId ||
    args.targetNodeId.length === 0
  )
    throw new Error('A SET needs two inputs and an explicit model identity.');
  if (
    args.inputs.some(
      (input) => !hasSameConnectionRef(first.sourceRef.connectionRef, input.sourceRef.connectionRef)
    )
  )
    throw new Error('Inputs must use the same execution connection.');
  const inputs = args.inputs.map((source, ordinal) =>
    createSourceRelation(
      {
        source,
        fields: source.fields.map((field) => field.name),
        fieldTypes: source.fields.map((field) => field.type),
        fieldNullabilities: source.fields.map((field) => field.nullable ?? true),
      },
      ordinal + 1
    )
  );
  const relationId = allocateDvtRelationId();
  const relAnchor = inputs.length + 1;
  const fields = inputs[0]!.fields.map((field, outputOrdinal) => ({
    fieldId: allocateDvtFieldId(),
    relationId,
    outputOrdinal,
    displayName: field.displayName,
    operandFieldIds: inputs.map((input) => {
      const dependency = input.fields[outputOrdinal];
      if (dependency == null) throw new Error('SET input widths differ.');
      return dependency.fieldId;
    }),
  }));
  const operation = args.operation ?? 'union_all';
  const relation = create(RelSchema, {
    relType: {
      case: 'set',
      value: {
        common: { relAnchor },
        op: sourceSetOperations[operation],
        inputs: inputs.map((input) => input.relation),
      },
    },
  });
  const [majorNumber, minorNumber, patchNumber] = DVT_SUBSTRAIT_SPEC_VERSION.split('.').map(Number);
  const document: SubstraitDocument = {
    plan: create(PlanSchema, {
      version: { majorNumber, minorNumber, patchNumber, producer: 'dvt-canvas' },
      relations: [
        {
          relType: {
            case: 'root',
            value: { input: relation, names: fields.map((field) => field.displayName) },
          },
        },
      ],
    }),
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: '0'.repeat(64),
      relations: [
        ...inputs.map((input) => input.binding),
        { relationId, relAnchor, displayName: operation },
      ],
      fields: [...inputs.flatMap((input) => input.fields), ...fields],
    },
  };
  deriveSubstraitSchemas(document);
  return document;
}
