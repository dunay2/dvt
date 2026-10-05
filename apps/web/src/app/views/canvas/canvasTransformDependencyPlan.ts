/**
 * Owned concern: materialize dependency layers as canonical ProjectRel changes.
 * @baseline ADR-0064: logical operator count is independent of Canvas card count.
 * @decision Preserve the public projection and reuse internal identities while rebinding ordinals.
 * @consequence One atomic change carries the complete typed meaning to every provider consumer.
 * @version 1.0.0
 */
import { create, equals } from '@bufbuild/protobuf';
import {
  RelSchema,
  type Rel,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { TypeSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  type DvtSubstraitFieldBindingV1,
  type DvtSubstraitRelationBindingV1,
} from '@dvt/contracts';
import {
  deriveExpressionSchema,
  type IndexedRelation,
  type RelationChangeSet,
  type SchemaField,
} from '@dvt/substrait-analysis';
import { rootFields } from './canvasDerivedOutputExpression';
import {
  retainTransformLayerFields,
  publishTransformFields,
  type TransformPublicOutput,
} from './canvasTransformDependencyFields';
import type {
  TransformDefinition,
  TransformDependencyModel,
} from './canvasTransformDependencyModel';
import { orderTransformDefinitions } from './canvasTransformDependencyOrder';
import {
  rebindTransformExpression,
  transformExpressionDependencies,
} from './canvasTransformExpressionReferences';
import { retypeTransformExpression } from './canvasTransformDependencyTypes';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';

type Upsert = RelationChangeSet['upserts'][number];
type DependencyPlanInput = Readonly<{
  model: TransformDependencyModel;
  definitions: readonly TransformDefinition[];
  outputs: readonly TransformPublicOutput[];
  inputSchema: readonly SchemaField[];
  plan: Plan;
  provider: string;
  nextAnchor: number;
}>;
type LayerState = Readonly<{
  relation: Rel;
  relationId: string;
  fields: readonly DvtSubstraitFieldBindingV1[];
  symbols: readonly string[];
}>;
type LayerContext = Pick<DependencyPlanInput, 'model' | 'plan' | 'provider'> &
  Readonly<{
    types: Map<string, SchemaField>;
    previousTypes: ReadonlyMap<string, SchemaField>;
    producerIds: ReadonlySet<string>;
  }>;

function project(
  binding: DvtSubstraitRelationBindingV1,
  input: Rel,
  expressions: Expression[],
  mapping?: number[]
): Rel {
  return create(RelSchema, {
    relType: {
      case: 'project',
      value: {
        input,
        expressions,
        common: {
          relAnchor: binding.relAnchor,
          ...(mapping == null
            ? {}
            : { emitKind: { case: 'emit' as const, value: { outputMapping: mapping } } }),
        },
      },
    },
  });
}

export function buildTransformDependencyPlan(args: DependencyPlanInput) {
  const { model } = args;
  const baseIds = rootFields(model.input.fields).map((field) => field.fieldId);
  const layers = orderTransformDefinitions(args.definitions, baseIds);
  const types = new Map(baseIds.map((id, ordinal) => [id, args.inputSchema[ordinal]!]));
  const context: LayerContext = {
    model,
    plan: args.plan,
    provider: args.provider,
    types,
    previousTypes: previousDefinitionTypes(model.definitions, types),
    producerIds: new Set(args.definitions.map((definition) => definition.binding.fieldId)),
  };
  const stages = model.members.filter((member) => member.binding.authoringOwnerRelationId != null);
  let state: LayerState = {
    relation: model.input.relation,
    relationId: model.input.binding.relationId,
    fields: model.input.fields,
    symbols: baseIds,
  };
  const changes: Upsert[] = [];
  const createdInputs = new Map<string, readonly string[]>();
  for (const [level, definitions] of layers.entries()) {
    const old = stages[level];
    const binding = old?.binding ?? {
      relationId: allocateDvtRelationId(),
      relAnchor: args.nextAnchor + level,
      authoringOwnerRelationId: model.root.binding.relationId,
    };
    const next = buildLayer(context, state, binding, old, definitions);
    changes.push({ relation: next.relation, binding, fields: next.fields });
    if (old == null) createdInputs.set(binding.relationId, [state.relationId]);
    state = next;
  }
  return {
    replacement: publicProjection(model, state, args.outputs),
    dependencies: changes,
    createdInputs,
    removed: stages.slice(layers.length).map((stage) => stage.binding.relationId),
  };
}

function previousDefinitionTypes(
  definitions: readonly TransformDefinition[],
  inputs: ReadonlyMap<string, SchemaField>
): ReadonlyMap<string, SchemaField> {
  const types = new Map(inputs);
  for (const definition of definitions)
    types.set(
      definition.id,
      deriveExpressionSchema(
        definition.expression,
        definition.inputIds.map((id) => types.get(id)!)
      )
    );
  return types;
}

function buildLayer(
  context: LayerContext,
  state: LayerState,
  binding: DvtSubstraitRelationBindingV1,
  previous: IndexedRelation | undefined,
  definitions: readonly TransformDefinition[]
): LayerState {
  const previousSymbols =
    previous == null ? [] : context.model.memberOutputIds.get(previous.binding.relationId)!;
  const fields = retainTransformLayerFields({
    relationId: binding.relationId,
    input: state.fields,
    symbols: state.symbols,
    previous: previous?.fields ?? [],
    previousSymbols,
    producerIds: context.producerIds,
  });
  const inputFields = rootFields(state.fields);
  const expressions = definitions.map((definition, ordinal) => {
    const expression = typedExpression(
      definition,
      context.types,
      context.previousTypes,
      context.plan,
      context.provider
    );
    context.types.set(
      definition.id,
      deriveExpressionSchema(
        expression,
        definition.inputIds.map((id) => context.types.get(id)!)
      )
    );
    fields.push(
      definitionField(definition, expression, binding.relationId, state, inputFields, ordinal)
    );
    return rebindTransformExpression(expression, definition.inputIds, state.symbols);
  });
  return {
    relation: project(binding, state.relation, expressions),
    relationId: binding.relationId,
    fields,
    symbols: [...state.symbols, ...definitions.map((definition) => definition.id)],
  };
}

function definitionField(
  definition: TransformDefinition,
  expression: Expression,
  relationId: string,
  state: LayerState,
  inputs: readonly DvtSubstraitFieldBindingV1[],
  ordinal: number
): DvtSubstraitFieldBindingV1 {
  const dependencies = transformExpressionDependencies(expression, definition.inputIds);
  const physicalIds = dependencies
    .map((id) => inputs[state.symbols.indexOf(id)]?.fieldId)
    .filter((id): id is string => id != null);
  return {
    fieldId:
      definition.owner.binding.authoringOwnerRelationId != null
        ? definition.binding.fieldId
        : allocateDvtFieldId(),
    relationId,
    outputOrdinal: state.symbols.length + ordinal,
    displayName: definition.output?.displayName ?? definition.binding.displayName,
    ...(physicalIds.length === 1
      ? { sourceFieldId: physicalIds[0]! }
      : physicalIds.length > 1
        ? { operandFieldIds: physicalIds }
        : {}),
  };
}

function publicProjection(
  model: TransformDependencyModel,
  state: LayerState,
  outputs: readonly TransformPublicOutput[]
): Upsert {
  const mapping = outputs.map((output) => state.symbols.indexOf(output.symbol));
  if (mapping.some((ordinal) => ordinal < 0))
    throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
  const fields = publishTransformFields(model, outputs, rootFields(state.fields), mapping);
  return {
    relation: project(model.root.binding, state.relation, [], mapping),
    binding: model.root.binding,
    fields,
  };
}

function typedExpression(
  definition: TransformDefinition,
  types: ReadonlyMap<string, SchemaField>,
  previous: ReadonlyMap<string, SchemaField>,
  plan: Plan,
  provider: string
): Expression {
  const references = transformExpressionDependencies(definition.expression, definition.inputIds);
  const changed = references.some((id) => {
    const before = previous.get(id);
    const after = types.get(id);
    return before != null && after != null && !equals(TypeSchema, before.type, after.type);
  });
  if (!changed) return definition.expression;
  try {
    return retypeTransformExpression(
      definition.expression,
      definition.inputIds.map((id) => types.get(id)!),
      plan,
      provider
    );
  } catch (cause) {
    throw new TransformDependencyError(
      TRANSFORM_DEPENDENCY_REJECTION.typeConflict,
      [definition.output?.displayName ?? definition.binding.displayName ?? definition.id],
      { cause }
    );
  }
}
