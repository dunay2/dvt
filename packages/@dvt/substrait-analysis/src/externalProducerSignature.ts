/** Project an external publication's assigned output contract as a logical Read signature. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create, toBinary } from '@bufbuild/protobuf';
import {
  DVT_SUBSTRAIT_SPEC_VERSION,
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';

import type { SubstraitDocument } from './document.js';
import { deriveSubstraitSchemas } from './relationSchema.js';

export function createExternalProducerSignature(
  input: Readonly<{
    relationId: string;
    names: readonly string[];
    fields: readonly Readonly<{ fieldId: string; name: string; type: Type }>[];
  }>
): SubstraitDocument {
  if (
    !input.relationId.trim() ||
    input.names.length === 0 ||
    input.names.some((name) => !name.trim()) ||
    input.fields.length === 0 ||
    new Set(input.fields.map((field) => field.fieldId)).size !== input.fields.length ||
    new Set(input.fields.map((field) => field.name)).size !== input.fields.length
  )
    throw new Error(
      'External publication requires distinct assigned fields and a scoped logical name.'
    );
  const [majorNumber, minorNumber, patchNumber] = DVT_SUBSTRAIT_SPEC_VERSION.split('.').map(Number);
  const read = create(RelSchema, {
    relType: {
      case: 'read',
      value: {
        common: { relAnchor: 1 },
        readType: { case: 'namedTable', value: { names: [...input.names] } },
        baseSchema: {
          names: input.fields.map((field) => field.name),
          struct: {
            nullability: Type_Nullability.REQUIRED,
            types: input.fields.map((field) => field.type),
          },
        },
      },
    },
  });
  const plan = create(PlanSchema, {
    version: {
      majorNumber: majorNumber!,
      minorNumber: minorNumber!,
      patchNumber: patchNumber!,
      producer: 'dvt-external-publication',
    },
    relations: [
      {
        relType: {
          case: 'root',
          value: { input: read, names: input.fields.map((field) => field.name) },
        },
      },
    ],
  });
  const document: SubstraitDocument = {
    plan,
    sidecar: {
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: sha256Hex(toBinary(PlanSchema, plan)),
      relations: [{ relationId: input.relationId, relAnchor: 1 }],
      fields: input.fields.map((field, outputOrdinal) => ({
        fieldId: field.fieldId,
        relationId: input.relationId,
        displayName: field.name,
        outputOrdinal,
      })),
    },
  };
  deriveSubstraitSchemas(document);
  return document;
}
