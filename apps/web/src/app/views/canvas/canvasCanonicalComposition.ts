/** Build a canonical binary relation from typed operands; their internal shapes are irrelevant. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  SubstraitAnalysisError,
  type RelationChangeSet,
  type SchemaField,
} from '@dvt/substrait-analysis';
import type { DvtSubstraitFieldBindingV1, DvtSubstraitRelationBindingV1 } from '@dvt/contracts';
import { sourceSetOperations } from './canvasSourceSet';
import {
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { isCanvasJoinOperation, toSubstraitJoinType } from './canvasRelationalTreeJoinType';
import { joinOutputScope } from './canvasSelectedJoinType';
import { joinConditionFields } from './canvasSelectedJoin';
import { buildSelectedJoinExpression } from './canvasSelectedJoinExpression';
import { createRelationPassthroughFields } from './canvasRelationPassthroughFields';
import {
  nameCompositionOutputs,
  retainCompositionOutputs,
  setCompositionOutputs,
} from './canvasCompositionOutputs';

type Entry = RelationChangeSet['upserts'][number];
type Composition = Readonly<{
  plan: Plan;
  binding: DvtSubstraitRelationBindingV1;
  inputs: readonly Entry[];
  schemas: readonly (readonly SchemaField[])[];
  operation: CanvasRelationalOperation;
  predicate?: Readonly<{ leftFieldId: string; rightFieldId: string }>;
  previousFields?: readonly DvtSubstraitFieldBindingV1[];
}>;
type Built = Readonly<{ relation: Entry['relation']; fields: Entry['fields']; extensions?: Plan }>;

function buildSet(args: Composition): Built {
  if (!isCanvasSetOperation(args.operation)) throw new Error('Expected SET operation.');
  const fields = setCompositionOutputs(
    args.binding.relationId,
    args.inputs.map((input) => input.fields)
  );
  return {
    fields,
    relation: create(RelSchema, {
      relType: {
        case: 'set',
        value: {
          common: { relAnchor: args.binding.relAnchor },
          op: sourceSetOperations[args.operation],
          inputs: args.inputs.map((input) => input.relation),
        },
      },
    }),
  };
}

function binaryFields(args: Composition) {
  return createRelationPassthroughFields(
    args.binding.relationId,
    args.inputs.flatMap((input, port) =>
      input.fields.map((field) => ({
        ...field,
        outputOrdinal:
          field.outputOrdinal +
          (field.parentFieldId == null && port === 1 ? args.schemas[0]!.length : 0),
      }))
    )
  );
}

function buildJoin(args: Composition): Built {
  if (!isCanvasJoinOperation(args.operation) || args.predicate == null)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'JOIN requires an explicit typed predicate.'
    );
  const type = toSubstraitJoinType(args.operation);
  const fields = joinConditionFields(
    args.inputs.map((input, port) => ({
      bindings: input.fields,
      fields: args.schemas[port]!,
    })),
    (field, port) => `${args.inputs[port]!.binding.displayName}.${field.displayName}`
  );
  const built = buildSelectedJoinExpression(
    { plan: args.plan, relationId: args.binding.relationId, fields },
    [
      {
        left: { kind: 'field', sourceFieldId: args.predicate.leftFieldId },
        right: { kind: 'field', sourceFieldId: args.predicate.rightFieldId },
      },
    ]
  );
  return {
    extensions: built.plan,
    fields: retainCompositionOutputs(
      binaryFields(args),
      joinOutputScope(
        type,
        args.schemas.map((schema) => schema.length)
      )
    ),
    relation: create(RelSchema, {
      relType: {
        case: 'join',
        value: {
          common: { relAnchor: args.binding.relAnchor },
          type,
          expression: built.expression,
          left: args.inputs[0]!.relation,
          right: args.inputs[1]!.relation,
        },
      },
    }),
  };
}

function buildCross(args: Composition): Built {
  return {
    fields: binaryFields(args),
    relation: create(RelSchema, {
      relType: {
        case: 'cross',
        value: {
          common: { relAnchor: args.binding.relAnchor },
          left: args.inputs[0]!.relation,
          right: args.inputs[1]!.relation,
        },
      },
    }),
  };
}

const builders = { join: buildJoin, set: buildSet, cross_join: buildCross };

export function createCanonicalComposition(args: Composition) {
  const kind = isCanvasJoinOperation(args.operation)
    ? 'join'
    : isCanvasSetOperation(args.operation)
      ? 'set'
      : args.operation;
  if (
    kind === 'projection' ||
    args.inputs.length < 2 ||
    (kind !== 'set' && args.inputs.length !== 2)
  )
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'The operation arity does not match its selected inputs.'
    );
  const built = builders[kind](args);
  return {
    ...built,
    binding: args.binding,
    fields: nameCompositionOutputs(built.fields, args.previousFields),
  };
}
