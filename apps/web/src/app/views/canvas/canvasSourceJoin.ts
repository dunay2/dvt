/** Initial JOIN construction from typed source occurrences; no fixture-specific product schema. */
import { create, equals } from '@bufbuild/protobuf';
import {
  JoinRel_JoinType,
  RelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  PlanSchema,
  PlanRelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  allocateDvtRelationId,
  allocateDvtFieldId,
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_SPEC_VERSION,
} from '@dvt/contracts';
import { deriveSubstraitSchemas, type SubstraitDocument } from '@dvt/substrait-analysis';
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import {
  createSourceRelation,
  sourceFieldType,
  type SourceRelationInput,
} from './canvasSourceRelation';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { comparisonFunctionIdentity } from './canvasDvtSubstraitJoinConditionInspection';

export function createSourceJoin(
  args: Readonly<{
    left: SourceRelationInput;
    right: SourceRelationInput;
    leftFieldName: string;
    rightFieldName: string;
    targetNodeId: string;
    joinType?: JoinRel_JoinType;
    outputs?: readonly Readonly<{ side: 0 | 1; fieldName: string; name: string }>[];
  }>
): SubstraitDocument {
  if (args.targetNodeId.trim() !== args.targetNodeId || args.targetNodeId.length === 0)
    throw new Error('The model identity must be nonblank and trimmed.');
  if (
    !hasSameConnectionRef(
      args.left.source.sourceRef.connectionRef,
      args.right.source.sourceRef.connectionRef
    )
  )
    throw new Error('Inputs must use the same execution connection.');
  const inputs = [createSourceRelation(args.left, 1), createSourceRelation(args.right, 2)];
  const ordinals = [
    args.left.fields.indexOf(args.leftFieldName),
    args.right.fields.indexOf(args.rightFieldName),
  ];
  if (ordinals.some((ordinal) => ordinal < 0))
    throw new Error('Predicate field is outside its input.');
  const types = [args.left, args.right].map((input, side) =>
    sourceFieldType(input.fieldTypes?.[ordinals[side]!] ?? 'string', true)
  );
  if (!equals(TypeSchema, types[0]!, types[1]!))
    throw new Error('JOIN comparison input types differ.');
  const [majorNumber, minorNumber, patchNumber] = DVT_SUBSTRAIT_SPEC_VERSION.split('.').map(Number);
  const plan = create(PlanSchema, {
    version: { majorNumber, minorNumber, patchNumber, producer: 'dvt-canvas' },
  });
  const functionReference = dvtSubstraitExpression.ensureScalarFunction(
    plan,
    comparisonFunctionIdentity('equal')
  ).functionAnchor;
  const relationId = allocateDvtRelationId();
  const type = args.joinType ?? JoinRel_JoinType.INNER;
  const leftOnly = type === JoinRel_JoinType.LEFT_SEMI || type === JoinRel_JoinType.LEFT_ANTI;
  const rightOnly = type === JoinRel_JoinType.RIGHT_SEMI || type === JoinRel_JoinType.RIGHT_ANTI;
  const available = inputs.flatMap((input, side) =>
    (leftOnly && side === 1) || (rightOnly && side === 0)
      ? []
      : input.fields.map((field) => ({ field, side }))
  );
  const used = new Set<string>();
  const outputs =
    args.outputs?.map((selection) => {
      const ordinal = available.findIndex(
        ({ field, side }) => side === selection.side && field.displayName === selection.fieldName
      );
      if (ordinal < 0) throw new Error('Selected output is absent from the JOIN result.');
      return { ordinal, field: available[ordinal]!.field, name: selection.name };
    }) ??
    available.map(({ field, side }, ordinal) => {
      const base = field.displayName;
      let name = base;
      let suffix = 2;
      while (used.has(name))
        name = `${[args.left, args.right][side]!.source.table}_${base}_${suffix++}`;
      used.add(name);
      return { ordinal, field, name };
    });
  const fields = outputs.map(({ field, name, ordinal: _ordinal }, outputOrdinal) => ({
    fieldId: allocateDvtFieldId(),
    relationId,
    outputOrdinal,
    displayName: name,
    sourceFieldId: field.fieldId,
  }));
  const relation = create(RelSchema, {
    relType: {
      case: 'join',
      value: {
        type,
        common: {
          relAnchor: 3,
          emitKind: {
            case: 'emit',
            value: { outputMapping: outputs.map(({ ordinal }) => ordinal) },
          },
        },
        left: inputs[0]!.relation,
        right: inputs[1]!.relation,
        expression: dvtSubstraitExpression.scalarFunction({
          functionReference,
          arguments: [
            dvtSubstraitExpression.field(ordinals[0]!),
            dvtSubstraitExpression.field(args.left.fields.length + ordinals[1]!),
          ],
          outputType: sourceFieldType('bool', true),
        }),
      },
    },
  });
  plan.relations = [
    create(PlanRelSchema, {
      relType: {
        case: 'root',
        value: {
          input: relation,
          names: outputs.map(({ name }) => name),
        },
      },
    }),
  ];
  const document: SubstraitDocument = {
    plan,
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: '0'.repeat(64),
      relations: [
        ...inputs.map((input) => input.binding),
        { relationId, relAnchor: 3, displayName: 'join' },
      ],
      fields: [...inputs.flatMap((input) => input.fields), ...fields],
    },
  };
  deriveSubstraitSchemas(document);
  return document;
}
