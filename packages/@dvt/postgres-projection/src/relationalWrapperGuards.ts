import {
  AggregateFunction_AggregationInvocation,
  AggregationPhase,
  Expression_WindowFunction_BoundsType,
  type AggregateRel,
  type Expression,
  type Expression_WindowFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { Type_Nullability } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';

import type { DvtSubstraitSetDraft } from './substraitSetReadModel.js';

export const COUNT_URN = 'extension:io.substrait:functions_aggregate_generic';
export const ROW_NUMBER_URN = 'extension:io.substrait:functions_arithmetic';
type WrapperField = DvtSubstraitSetDraft['sidecar']['fields'][number];
function resolveUrn(plan: Plan, anchor: number): string | null {
  return plan.extensionUrns.find((entry) => entry.extensionUrnAnchor === anchor)?.urn ?? null;
}

export function fieldOrdinal(expression: Expression | undefined): number | null {
  if (expression?.rexType.case !== 'selection') return null;
  const reference = expression.rexType.value;
  const segment =
    reference.referenceType.case === 'directReference'
      ? reference.referenceType.value.referenceType
      : undefined;
  return reference.rootType.case === 'rootReference' &&
    segment?.case === 'structField' &&
    segment.value.child == null
    ? segment.value.field
    : null;
}

export function isCount(plan: Plan, aggregate: AggregateRel): boolean {
  const measure = aggregate.measures[0];
  const fn = measure?.measure;
  if (
    measure == null ||
    measure.filter != null ||
    fn == null ||
    fn.arguments.length !== 0 ||
    fn.options.length !== 0 ||
    fn.sorts.length !== 0 ||
    fn.phase !== AggregationPhase.INITIAL_TO_RESULT ||
    fn.invocation !== AggregateFunction_AggregationInvocation.ALL ||
    fn.outputType?.kind.case !== 'i64' ||
    fn.outputType.kind.value.nullability !== Type_Nullability.REQUIRED
  ) {
    return false;
  }
  const declarations = plan.extensions.filter(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      resolveUrn(plan, entry.mappingType.value.extensionUrnReference) === COUNT_URN
  );
  const declaration = declarations[0];
  return (
    declarations.length === 1 &&
    plan.extensionUrns.filter((entry) => entry.urn === COUNT_URN).length === 1 &&
    declaration?.mappingType.case === 'extensionFunction' &&
    declaration.mappingType.value.functionAnchor === fn.functionReference &&
    declaration.mappingType.value.name === 'count'
  );
}

export function isRowNumber(plan: Plan, fn: Expression_WindowFunction): boolean {
  if (
    fn.arguments.length !== 0 ||
    fn.options.length !== 0 ||
    fn.outputType?.kind.case !== 'i64' ||
    fn.outputType.kind.value.nullability !== Type_Nullability.NULLABLE ||
    fn.phase !== AggregationPhase.INITIAL_TO_RESULT ||
    fn.invocation !== AggregateFunction_AggregationInvocation.ALL ||
    fn.boundsType !== Expression_WindowFunction_BoundsType.UNSPECIFIED ||
    fn.lowerBound != null ||
    fn.upperBound != null
  ) {
    return false;
  }
  const declarations = plan.extensions.filter(
    (entry) =>
      entry.mappingType.case === 'extensionFunction' &&
      resolveUrn(plan, entry.mappingType.value.extensionUrnReference) === ROW_NUMBER_URN
  );
  const declaration = declarations[0];
  return (
    declarations.length === 1 &&
    plan.extensionUrns.filter((entry) => entry.urn === ROW_NUMBER_URN).length === 1 &&
    declaration?.mappingType.case === 'extensionFunction' &&
    declaration.mappingType.value.functionAnchor === fn.functionReference &&
    declaration.mappingType.value.name === 'row_number'
  );
}

export function removeFunction(plan: Plan, urn: string, name: string): void {
  plan.extensions = plan.extensions.filter(
    (entry) =>
      !(
        entry.mappingType.case === 'extensionFunction' &&
        entry.mappingType.value.name === name &&
        resolveUrn(plan, entry.mappingType.value.extensionUrnReference) === urn
      )
  );
  const referencedUrns = new Set(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [entry.mappingType.value.extensionUrnReference]
        : []
    )
  );
  plan.extensionUrns = plan.extensionUrns.filter(
    (entry) => entry.urn !== urn || referencedUrns.has(entry.extensionUrnAnchor)
  );
}

export function sortedFields(draft: DvtSubstraitSetDraft, relationId: string): WrapperField[] {
  return draft.sidecar.fields
    .filter((field) => field.relationId === relationId)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

export function withCurrentHash(draft: DvtSubstraitSetDraft): DvtSubstraitSetDraft {
  return {
    ...draft,
    sidecar: {
      ...draft.sidecar,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, draft.plan)),
    },
  };
}
