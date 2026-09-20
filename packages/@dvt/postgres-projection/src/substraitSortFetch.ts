/** Owns construction and fail-closed inspection of the admitted SortRel/FetchRel profile. */
import {
  ExpressionSchema,
  Expression_FieldReferenceSchema,
  Expression_FieldReference_RootReferenceSchema,
  Expression_LiteralSchema,
  Expression_ReferenceSegmentSchema,
  Expression_ReferenceSegment_StructFieldSchema,
  FetchRelSchema,
  RelCommonSchema,
  RelCommon_DirectSchema,
  RelSchema,
  SortFieldSchema,
  SortField_SortDirection,
  SortRelSchema,
  type Rel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { clone, create, toBinary } from '@bufbuild/protobuf';
import {
  DvtSubstraitAuthoringSidecarV1Schema,
  type DvtSubstraitFieldBindingV1,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import { dvtSubstraitExpressionReader } from './substraitExpressionReader.js';
import {
  hasCurrentJoinSemanticHash,
  hasUniqueJoinSidecarIdentity,
} from './substraitJoinInspectionGuards.js';
import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';

export type DvtSubstraitSortDirection =
  | SortField_SortDirection.ASC_NULLS_FIRST
  | SortField_SortDirection.ASC_NULLS_LAST
  | SortField_SortDirection.DESC_NULLS_FIRST
  | SortField_SortDirection.DESC_NULLS_LAST;

export type DvtSubstraitSortKey = Readonly<{
  fieldId: string;
  direction: DvtSubstraitSortDirection;
}>;

export type DvtSubstraitSortFetchRootInspection =
  | Readonly<{
      ok: true;
      operation: 'sort';
      relationId: string;
      inputRelationId: string;
      keys: readonly DvtSubstraitSortKey[];
      outputFields: readonly DvtSubstraitFieldBindingV1[];
    }>
  | Readonly<{
      ok: true;
      operation: 'fetch';
      relationId: string;
      inputRelationId: string;
      offset: bigint | null;
      count: bigint | null;
      outputFields: readonly DvtSubstraitFieldBindingV1[];
    }>
  | Readonly<{ ok: false }>;

const ADMITTED_DIRECTIONS = new Set<number>([
  SortField_SortDirection.ASC_NULLS_FIRST,
  SortField_SortDirection.ASC_NULLS_LAST,
  SortField_SortDirection.DESC_NULLS_FIRST,
  SortField_SortDirection.DESC_NULLS_LAST,
]);

const I64_MAX = 9_223_372_036_854_775_807n;

function rootInput(draft: DvtSubstraitJoinDraft): Rel {
  const root = draft.plan.relations[0]?.relType;
  if (draft.plan.relations.length !== 1 || root?.case !== 'root' || root.value.input == null) {
    throw new Error('Sort/Fetch authoring requires one canonical root relation.');
  }
  return root.value.input;
}

function relationAnchor(rel: Rel): number | null {
  const value: unknown = rel.relType.value;
  if (value == null || typeof value !== 'object') return null;
  const common = (value as { common?: { relAnchor?: number } }).common;
  return common?.relAnchor ?? null;
}

function fieldsForAnchor(draft: DvtSubstraitJoinDraft, anchor: number) {
  const relation = draft.sidecar.relations.find((candidate) => candidate.relAnchor === anchor);
  if (relation == null) throw new Error('Sort/Fetch input relation identity is unavailable.');
  const fields = draft.sidecar.fields
    .filter((field) => field.relationId === relation.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (fields.some((field, ordinal) => field.outputOrdinal !== ordinal)) {
    throw new Error('Sort/Fetch input fields are not canonically ordered.');
  }
  return { relation, fields };
}

function wrapperFields(
  inputFields: readonly DvtSubstraitFieldBindingV1[],
  relationId: string,
  outputFieldIds: readonly string[]
): DvtSubstraitFieldBindingV1[] {
  if (
    outputFieldIds.length !== inputFields.length ||
    new Set(outputFieldIds).size !== outputFieldIds.length
  ) {
    throw new Error('Sort/Fetch output FieldIds must map every input field exactly once.');
  }
  return inputFields.map((field, outputOrdinal) => ({
    fieldId: outputFieldIds[outputOrdinal]!,
    relationId,
    sourceFieldId: field.fieldId,
    outputOrdinal,
    ...(field.displayName == null ? {} : { displayName: field.displayName }),
    ...(field.description == null ? {} : { description: field.description }),
  }));
}

function finalizeWrapper(
  draft: DvtSubstraitJoinDraft,
  args: Readonly<{
    relationId: string;
    outputFieldIds: readonly string[];
    displayName: string;
    build: (input: Rel, relAnchor: number) => Rel;
  }>
): DvtSubstraitJoinDraft {
  if (!hasUniqueJoinSidecarIdentity(draft) || !hasCurrentJoinSemanticHash(draft)) {
    throw new Error('Sort/Fetch authoring requires current, unique semantic identities.');
  }
  if (draft.sidecar.relations.some((relation) => relation.relationId === args.relationId)) {
    throw new Error('Sort/Fetch relation identity already exists.');
  }
  const plan = clone(PlanSchema, draft.plan);
  const input = rootInput({ plan, sidecar: draft.sidecar });
  const inputAnchor = relationAnchor(input);
  if (inputAnchor == null) throw new Error('Sort/Fetch input relation anchor is unavailable.');
  const { fields: inputFields } = fieldsForAnchor(draft, inputAnchor);
  const relAnchor =
    Math.max(0, ...draft.sidecar.relations.map((relation) => relation.relAnchor)) + 1;
  const outputFields = wrapperFields(inputFields, args.relationId, args.outputFieldIds);
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root') throw new Error('Sort/Fetch canonical root is unavailable.');
  root.value.input = args.build(input, relAnchor);
  const semanticPlanSha256 = sha256Hex(toBinary(PlanSchema, plan));
  return {
    plan,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema.parse({
      ...draft.sidecar,
      semanticPlanSha256,
      relations: [
        ...draft.sidecar.relations,
        { relationId: args.relationId, relAnchor, displayName: args.displayName },
      ],
      fields: [...draft.sidecar.fields, ...outputFields],
    }),
  };
}

export function createDvtSubstraitSortDraft(
  draft: DvtSubstraitJoinDraft,
  args: Readonly<{
    relationId: string;
    outputFieldIds: readonly string[];
    keys: readonly DvtSubstraitSortKey[];
  }>
): DvtSubstraitJoinDraft {
  if (
    args.keys.length === 0 ||
    new Set(args.keys.map((key) => key.fieldId)).size !== args.keys.length ||
    args.keys.some((key) => !ADMITTED_DIRECTIONS.has(key.direction))
  ) {
    throw new Error(
      'Sort requires admitted field keys with explicit direction and NULL placement.'
    );
  }
  const input = rootInput(draft);
  const inputAnchor = relationAnchor(input);
  if (inputAnchor == null) throw new Error('Sort input relation anchor is unavailable.');
  const { fields } = fieldsForAnchor(draft, inputAnchor);
  const ordinalByFieldId = new Map(fields.map((field) => [field.fieldId, field.outputOrdinal]));
  if (args.keys.some((key) => ordinalByFieldId.get(key.fieldId) == null)) {
    throw new Error('Sort key references a field outside the selected relation.');
  }
  return finalizeWrapper(draft, {
    ...args,
    displayName: 'Sort',
    build: (wrappedInput, relAnchor) =>
      create(RelSchema, {
        relType: {
          case: 'sort',
          value: create(SortRelSchema, {
            common: create(RelCommonSchema, {
              relAnchor,
              emitKind: { case: 'direct', value: create(RelCommon_DirectSchema, {}) },
            }),
            input: wrappedInput,
            sorts: args.keys.map((key) =>
              create(SortFieldSchema, {
                expr: createDirectFieldExpression(ordinalByFieldId.get(key.fieldId)!),
                sortKind: { case: 'direction', value: key.direction },
              })
            ),
          }),
        },
      }),
  });
}

export function createDvtSubstraitFetchDraft(
  draft: DvtSubstraitJoinDraft,
  args: Readonly<{
    relationId: string;
    outputFieldIds: readonly string[];
    offset?: bigint | null;
    count?: bigint | null;
  }>
): DvtSubstraitJoinDraft {
  for (const value of [args.offset, args.count]) {
    if (value != null && (value < 0n || value > I64_MAX)) {
      throw new Error('Fetch offset and count must be non-negative signed i64 values.');
    }
  }
  return finalizeWrapper(draft, {
    ...args,
    displayName: 'Fetch',
    build: (input, relAnchor) =>
      create(RelSchema, {
        relType: {
          case: 'fetch',
          value: create(FetchRelSchema, {
            common: create(RelCommonSchema, {
              relAnchor,
              emitKind: { case: 'direct', value: create(RelCommon_DirectSchema, {}) },
            }),
            input,
            ...(args.offset == null ? {} : { offsetExpr: createI64Literal(args.offset) }),
            ...(args.count == null ? {} : { countExpr: createI64Literal(args.count) }),
          }),
        },
      }),
  });
}

function createDirectFieldExpression(ordinal: number) {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: create(Expression_FieldReferenceSchema, {
        referenceType: {
          case: 'directReference',
          value: create(Expression_ReferenceSegmentSchema, {
            referenceType: {
              case: 'structField',
              value: create(Expression_ReferenceSegment_StructFieldSchema, { field: ordinal }),
            },
          }),
        },
        rootType: {
          case: 'rootReference',
          value: create(Expression_FieldReference_RootReferenceSchema, {}),
        },
      }),
    },
  });
}

function createI64Literal(value: bigint) {
  return create(ExpressionSchema, {
    rexType: {
      case: 'literal',
      value: create(Expression_LiteralSchema, { literalType: { case: 'i64', value } }),
    },
  });
}

function directCommon(rel: Rel): Readonly<{ anchor: number }> | null {
  const value: unknown = rel.relType.value;
  if (value == null || typeof value !== 'object') return null;
  const record = value as {
    common?: {
      relAnchor?: number;
      emitKind: { case?: string };
      hint?: unknown;
      advancedExtension?: unknown;
    };
    advancedExtension?: unknown;
  };
  const common = record.common;
  if (
    common?.relAnchor == null ||
    (common.emitKind.case !== undefined && common.emitKind.case !== 'direct') ||
    common.hint != null ||
    common.advancedExtension != null ||
    record.advancedExtension != null
  ) {
    return null;
  }
  return { anchor: common.relAnchor };
}

function inspectWrapperIdentity(draft: DvtSubstraitJoinDraft, rel: Rel, input: Rel) {
  const wrapperCommon = directCommon(rel);
  const inputAnchor = relationAnchor(input);
  if (wrapperCommon == null || inputAnchor == null) return null;
  const relation = draft.sidecar.relations.find(
    (candidate) => candidate.relAnchor === wrapperCommon.anchor && candidate.sourceRef == null
  );
  const inputRelation = draft.sidecar.relations.find(
    (candidate) => candidate.relAnchor === inputAnchor
  );
  if (relation == null || inputRelation == null) return null;
  const inputFields = draft.sidecar.fields
    .filter((field) => field.relationId === inputRelation.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const outputFields = draft.sidecar.fields
    .filter((field) => field.relationId === relation.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (
    inputFields.length !== outputFields.length ||
    outputFields.some(
      (field, ordinal) =>
        field.outputOrdinal !== ordinal || field.sourceFieldId !== inputFields[ordinal]?.fieldId
    )
  ) {
    return null;
  }
  return { relation, inputRelation, inputFields, outputFields };
}

function inspectFetchValue(
  expression: Parameters<typeof dvtSubstraitExpressionReader.literalValue>[0]
) {
  if (expression == null) return null;
  const literal = dvtSubstraitExpressionReader.literalValue(expression);
  if (literal?.dataType === 'i64' && literal.value >= 0n && literal.value <= I64_MAX) {
    return literal.value;
  }
  if (
    expression.rexType.case === 'literal' &&
    expression.rexType.value.literalType.case === 'null' &&
    expression.rexType.value.literalType.value.kind.case === 'i64'
  ) {
    return null;
  }
  return undefined;
}

export function inspectDvtSubstraitSortFetchRoot(
  draft: DvtSubstraitJoinDraft
): DvtSubstraitSortFetchRootInspection {
  if (!hasUniqueJoinSidecarIdentity(draft) || !hasCurrentJoinSemanticHash(draft)) {
    return { ok: false };
  }
  let root: Rel;
  try {
    root = rootInput(draft);
  } catch {
    return { ok: false };
  }
  if (root.relType.case === 'sort') {
    const sort = root.relType.value;
    if (sort.input == null || sort.sorts.length === 0) return { ok: false };
    const identity = inspectWrapperIdentity(draft, root, sort.input);
    if (identity == null) return { ok: false };
    const keys = sort.sorts.map((field) => {
      const ordinal = dvtSubstraitExpressionReader.fieldOrdinal(field.expr);
      const direction = field.sortKind.case === 'direction' ? field.sortKind.value : null;
      const inputField = ordinal == null ? undefined : identity.inputFields[ordinal];
      return inputField == null || direction == null || !ADMITTED_DIRECTIONS.has(direction)
        ? null
        : { fieldId: inputField.fieldId, direction: direction as DvtSubstraitSortDirection };
    });
    if (keys.some((key) => key == null)) return { ok: false };
    return {
      ok: true,
      operation: 'sort',
      relationId: identity.relation.relationId,
      inputRelationId: identity.inputRelation.relationId,
      keys: keys as DvtSubstraitSortKey[],
      outputFields: identity.outputFields,
    };
  }
  if (root.relType.case === 'fetch') {
    const fetch = root.relType.value;
    if (fetch.input == null) return { ok: false };
    const identity = inspectWrapperIdentity(draft, root, fetch.input);
    if (identity == null) return { ok: false };
    const offset = inspectFetchValue(fetch.offsetExpr);
    const count = inspectFetchValue(fetch.countExpr);
    if (offset === undefined || count === undefined) return { ok: false };
    return {
      ok: true,
      operation: 'fetch',
      relationId: identity.relation.relationId,
      inputRelationId: identity.inputRelation.relationId,
      offset,
      count,
      outputFields: identity.outputFields,
    };
  }
  return { ok: false };
}

function replaceUnaryRelation(
  rel: Rel,
  targetAnchor: number
): Readonly<{ replaced: boolean; inputAnchor: number | null }> {
  const value = rel.relType.value;
  if (value == null || typeof value !== 'object') return { replaced: false, inputAnchor: null };
  const unary = value as { input?: Rel };
  if (unary.input != null) {
    const input = unary.input;
    if (relationAnchor(rel) === targetAnchor) {
      return { replaced: true, inputAnchor: relationAnchor(input) };
    }
    const nested = replaceUnaryRelation(input, targetAnchor);
    if (nested.replaced) {
      if (relationAnchor(input) === targetAnchor) {
        const inputValue = input.relType.value as { input?: Rel } | undefined;
        if (inputValue?.input == null) return { replaced: false, inputAnchor: null };
        unary.input = inputValue.input;
      }
      return nested;
    }
  }
  if (rel.relType.case === 'join' || rel.relType.case === 'cross') {
    for (const side of ['left', 'right'] as const) {
      const child = rel.relType.value[side];
      if (child == null) continue;
      if (relationAnchor(child) === targetAnchor) {
        const childValue = child.relType.value as { input?: Rel } | undefined;
        if (childValue?.input == null) return { replaced: false, inputAnchor: null };
        rel.relType.value[side] = childValue.input;
        return { replaced: true, inputAnchor: relationAnchor(childValue.input) };
      }
      const nested = replaceUnaryRelation(child, targetAnchor);
      if (nested.replaced) return nested;
    }
  }
  if (rel.relType.case === 'set') {
    for (let index = 0; index < rel.relType.value.inputs.length; index += 1) {
      const child = rel.relType.value.inputs[index]!;
      if (relationAnchor(child) === targetAnchor) {
        const childValue = child.relType.value as { input?: Rel } | undefined;
        if (childValue?.input == null) return { replaced: false, inputAnchor: null };
        rel.relType.value.inputs[index] = childValue.input;
        return { replaced: true, inputAnchor: relationAnchor(childValue.input) };
      }
      const nested = replaceUnaryRelation(child, targetAnchor);
      if (nested.replaced) return nested;
    }
  }
  return { replaced: false, inputAnchor: null };
}

/** Removes exactly one identity-preserving SortRel/FetchRel wrapper by stable RelationId. */
export function removeDvtSubstraitSortFetchRelation(
  draft: DvtSubstraitJoinDraft,
  relationId: string
): DvtSubstraitJoinDraft {
  if (!hasUniqueJoinSidecarIdentity(draft) || !hasCurrentJoinSemanticHash(draft)) return draft;
  const binding = draft.sidecar.relations.find((relation) => relation.relationId === relationId);
  if (binding == null) return draft;
  const plan = clone(PlanSchema, draft.plan);
  const root = plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input == null) return draft;
  const target = (function find(rel: Rel): Rel | null {
    if (relationAnchor(rel) === binding.relAnchor) return rel;
    const value = rel.relType.value;
    if (value != null && typeof value === 'object' && 'input' in value) {
      const input = (value as { input?: Rel }).input;
      if (input != null) return find(input);
    }
    if (rel.relType.case === 'join' || rel.relType.case === 'cross') {
      return (
        (rel.relType.value.left == null ? null : find(rel.relType.value.left)) ??
        (rel.relType.value.right == null ? null : find(rel.relType.value.right))
      );
    }
    if (rel.relType.case === 'set') {
      for (const input of rel.relType.value.inputs) {
        const found = find(input);
        if (found != null) return found;
      }
    }
    return null;
  })(root.value.input);
  if (
    target == null ||
    (target.relType.case !== 'sort' && target.relType.case !== 'fetch') ||
    target.relType.value.input == null
  ) {
    return draft;
  }
  const inputAnchor = relationAnchor(target.relType.value.input);
  if (inputAnchor == null) return draft;
  const inputRelation = draft.sidecar.relations.find(
    (relation) => relation.relAnchor === inputAnchor
  );
  if (inputRelation == null) return draft;
  const removedFields = draft.sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const inputFields = draft.sidecar.fields
    .filter((field) => field.relationId === inputRelation.relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  if (removedFields.length !== inputFields.length) return draft;
  const replacementByFieldId = new Map(
    removedFields.map((field, index) => [field.fieldId, inputFields[index]!.fieldId])
  );
  if (relationAnchor(root.value.input) === binding.relAnchor) {
    root.value.input = target.relType.value.input;
    root.value.names = inputFields.map((field) => field.displayName ?? '');
  } else {
    const replacement = replaceUnaryRelation(root.value.input, binding.relAnchor);
    if (!replacement.replaced || replacement.inputAnchor !== inputAnchor) return draft;
  }
  const semanticPlanSha256 = sha256Hex(toBinary(PlanSchema, plan));
  return {
    plan,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema.parse({
      ...draft.sidecar,
      semanticPlanSha256,
      relations: draft.sidecar.relations.filter((relation) => relation.relationId !== relationId),
      fields: draft.sidecar.fields
        .filter((field) => field.relationId !== relationId)
        .map((field) => ({
          ...field,
          ...(field.sourceFieldId == null
            ? {}
            : {
                sourceFieldId: replacementByFieldId.get(field.sourceFieldId) ?? field.sourceFieldId,
              }),
        })),
    }),
  };
}
