/** Identify the exact single-row relation that needs an execution connection and no input. */
import {
  ReadRelSchema,
  type ReadRel,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { create, equals } from '@bufbuild/protobuf';

import { isDvtSubstraitLiteralRowValuesV1 } from './DvtSubstraitLiteralRowValues.v1.js';
import { decodeDvtSubstraitPlanV1, encodeDvtSubstraitPlanV1 } from './DvtSubstraitPlanBinary.v1.js';
import {
  DvtSubstraitSemanticDocumentV1Schema,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitSemanticDocumentV1,
} from './DvtSubstraitSemanticDocument.v1.js';

type Sidecar = DvtSubstraitAuthoringSidecarV1;

function fieldMatches(
  field: Sidecar['fields'][number],
  relationId: string,
  names: readonly string[]
): boolean {
  if (
    [field.sourceFieldId, field.parentFieldId, field.operandFieldIds].some(
      (value) => value !== undefined
    )
  )
    return false;
  return (
    field.relationId === relationId &&
    field.displayName !== undefined &&
    field.displayName === names[field.outputOrdinal]
  );
}

function hasLiteralBindings(sidecar: Sidecar, read: ReadRel, names: readonly string[]): boolean {
  if (sidecar.relations.length !== 1) return false;
  const binding = sidecar.relations[0]!;
  if (binding.relAnchor !== read.common?.relAnchor) return false;
  if (
    [binding.sourceRef, binding.producerRef, binding.authoringOwnerRelationId].some(
      (value) => value !== undefined
    )
  )
    return false;
  const fields = sidecar.fields;
  if (
    fields.length !== names.length ||
    new Set(fields.map((field) => field.outputOrdinal)).size !== names.length
  )
    return false;
  return fields.every((field) => fieldMatches(field, binding.relationId, names));
}

function hasDirectReadShape(read: ReadRel): boolean {
  const common = read.common;
  if (!common || common.emitKind.case === 'emit') return false;
  return equals(
    ReadRelSchema,
    read,
    create(ReadRelSchema, {
      common: { relAnchor: common.relAnchor, emitKind: common.emitKind },
      baseSchema: read.baseSchema,
      readType: read.readType,
    })
  );
}

function hasCurrentLiteralPlan(plan: Plan, sidecar: Sidecar): boolean {
  if (
    !equals(
      PlanSchema,
      plan,
      create(PlanSchema, { version: plan.version, relations: plan.relations })
    )
  )
    return false;
  try {
    return encodeDvtSubstraitPlanV1(plan).sha256 === sidecar.semanticPlanSha256;
  } catch {
    return false;
  }
}

type LiteralRead = Readonly<{ read: ReadRel; names: readonly string[] }>;

function rootRead(plan: Plan): LiteralRead | undefined {
  if (plan.relations.length !== 1) return undefined;
  const root = plan.relations[0]!.relType;
  if (root.case !== 'root') return undefined;
  const input = root.value.input?.relType;
  if (input?.case !== 'read') return undefined;
  return { read: input.value, names: root.value.names };
}

export function isDvtSubstraitLiteralRowPlanV1(plan: Plan, sidecar: Sidecar): boolean {
  const root = rootRead(plan);
  if (!root) return false;
  const { read, names } = root;
  if (!isDvtSubstraitLiteralRowValuesV1(read, names)) return false;
  if (!hasDirectReadShape(read)) return false;
  if (!hasLiteralBindings(sidecar, read, names)) return false;
  return hasCurrentLiteralPlan(plan, sidecar);
}

export function isSourceFreeDvtSubstraitDocumentV1(
  document: DvtSubstraitSemanticDocumentV1
): boolean {
  if (!DvtSubstraitSemanticDocumentV1Schema.safeParse(document).success) return false;
  return isDvtSubstraitLiteralRowPlanV1(decodeDvtSubstraitPlanV1(document), document.sidecar);
}
