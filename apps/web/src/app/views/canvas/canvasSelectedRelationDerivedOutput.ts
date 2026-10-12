/**
 * Owned concern: apply one calculated-field command at the revisioned Transform boundary.
 * @baseline ADR-0064: definitions and dependencies persist only as canonical Substrait.
 * @decision Stage the complete dependency plan before the shared atomic commit.
 * @consequence Producer edits preserve public identities and update downstream calculations.
 * @version 1.0.0
 */
import { clone, create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  rootFields,
  reject,
  type DvtSubstraitOutputExpressionCandidate,
} from './canvasDerivedOutputExpression';
import {
  prepareSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';
import { commitSelectedRelation } from './canvasCommitSelectedRelation';
import {
  readCanvasTransformDependencyModel,
  type TransformDefinition,
  type TransformDependencyModel,
} from './canvasTransformDependencyModel';
import { readTransformFormulaScope } from './canvasTransformFormulaScope';
import { compileTransformCommandExpression } from './canvasTransformCommandExpression';
import { buildTransformDependencyPlan } from './canvasTransformDependencyPlan';

export type SelectedRelationDerivedOutputRequest = SelectedUnaryRequest &
  Readonly<{ alias: string; outputFieldId?: string }> &
  (
    | Readonly<{ formula: string }>
    | Readonly<{
        capabilityIds: readonly [string, ...string[]];
        operandFieldIds: readonly [string, ...string[]];
      }>
    | Readonly<{
        expression: Exclude<DvtSubstraitOutputExpressionCandidate, { kind: 'scalar-function' }>;
      }>
  );

export async function applySelectedRelationDerivedOutput(
  session: CanvasRelationAnalysisSession,
  request: SelectedRelationDerivedOutputRequest
) {
  const alias = DvtSemanticFieldNameV1Schema.parse(request.alias.trim());
  const prepared = await prepareSelectedRelationUnary(session, request, 'project');
  const root = preparedTransformRoot(prepared);
  const model = readCanvasTransformDependencyModel(root, (id) =>
    session.locate(id, request.expectedRevision)
  );
  const edit = resolveDefinitionEdit(model, request, alias);
  const scope = await readTransformFormulaScope(session, model, request.signal);
  const plan = clone(PlanSchema, { ...prepared.target.plan, relations: [] });
  const provider = session.executionProvider(request.expectedRevision);
  const expression = compileTransformCommandExpression(request, scope, plan, provider);
  if (expression == null) reject('Derived-output capability is unavailable.', request.relationId);
  const replacement = stageDefinitionReplacement(model, edit, alias, expression, scope.symbols);
  const changes = buildTransformDependencyPlan({
    model,
    ...replacement,
    inputSchema: scope.input.fields,
    plan,
    provider,
    nextAnchor: prepared.target.nextAnchor + (request.intent === 'insert' ? 1 : 0),
  });
  if (request.intent === 'insert')
    changes.createdInputs.set(root.binding.relationId, [prepared.input.binding.relationId]);
  return commitSelectedRelation(session, { ...request, ...changes, extensions: plan });
}

function preparedTransformRoot(prepared: Awaited<ReturnType<typeof prepareSelectedRelationUnary>>) {
  return prepared.request.intent === 'edit'
    ? prepared.target
    : {
        ...prepared.target,
        binding: prepared.binding,
        fields: prepared.fields,
        inputs: [prepared.input.binding.relationId],
        relation: create(RelSchema, {
          relType: {
            case: 'project',
            value: {
              input: prepared.input.relation,
              common: { relAnchor: prepared.binding.relAnchor },
            },
          },
        }),
      };
}

function resolveDefinitionEdit(
  model: TransformDependencyModel,
  request: SelectedRelationDerivedOutputRequest,
  alias: string
) {
  const outputs = rootFields(model.root.fields).map((field) => ({
    field,
    symbol: model.outputIds[field.outputOrdinal]!,
  }));
  const replacing = outputs.find((output) => output.field.fieldId === request.outputFieldId);
  const previous = model.definitions.find(
    (definition) =>
      definition.id === replacing?.symbol || definition.binding.fieldId === request.outputFieldId
  );
  if (
    request.outputFieldId != null &&
    ((replacing == null && previous == null) || request.intent !== 'edit')
  )
    reject('Output is unavailable for editing.', request.relationId);
  if (
    outputs.some(
      ({ field }) => field.displayName === alias && field.fieldId !== request.outputFieldId
    )
  )
    reject('Derived-output alias is already used.', request.relationId);
  if (
    model.definitions.some(
      (definition) =>
        definition !== previous &&
        definition.output == null &&
        definition.binding.displayName === alias
    )
  )
    reject('Derived-output alias is already used.', request.relationId);
  return { outputs, replacing, previous };
}

function stageDefinitionReplacement(
  model: TransformDependencyModel,
  edit: ReturnType<typeof resolveDefinitionEdit>,
  alias: string,
  expression: TransformDefinition['expression'],
  inputIds: TransformDefinition['inputIds']
) {
  const { outputs, replacing, previous } = edit;
  const hidden = previous != null && replacing == null;
  const field = {
    ...replacing?.field,
    fieldId: replacing?.field.fieldId ?? allocateDvtFieldId(),
    relationId: model.root.binding.relationId,
    outputOrdinal: replacing?.field.outputOrdinal ?? outputs.length,
    displayName: alias,
  };
  const definition: TransformDefinition = {
    id: previous?.id ?? allocateDvtFieldId(),
    binding: previous == null ? field : { ...previous.binding, displayName: alias },
    owner: previous?.owner ?? model.root,
    ordinal: previous?.ordinal ?? model.definitions.length,
    expression,
    inputIds,
    ...(hidden ? {} : { output: field }),
  };
  const definitions = [...model.definitions.filter((entry) => entry !== previous), definition];
  const output = { field, symbol: definition.id };
  if (!hidden) {
    if (replacing == null) outputs.push(output);
    else outputs[replacing.field.outputOrdinal] = output;
  }
  return { definitions, outputs };
}
