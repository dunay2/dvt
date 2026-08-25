/**
 * Owned concern: pin the first DVT Substrait semantic profile and define the
 * identity-only authoring sidecar that binds stable DVT relation/field ids to
 * one exact serialized Substrait Plan.
 *
 * This contract does not redefine Substrait relations, expressions, types, or
 * functions. It persists profile coordinates, opaque canonical Plan bytes,
 * and only the DVT identity/provenance information required for editable
 * cards. SQL rendering, SQL parsing, provider validation, planning, and runtime
 * execution remain outside this boundary.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Pin one exact Substrait release and map stable DVT ids to rel_anchor/output ordinals.
 * @consequence Rename/reorder/reload can preserve identity without a private DVT relational IR.
 * @version 1.0.0
 */
import { base64Bytes, sha256Hex } from '@dvt/crypto';
import { z } from 'zod';

import { ConnectedSourceRefSchema } from '../source-import/ConnectedSourceRef.v1.js';

const NonBlankStringSchema = z.string().refine(
  (value) => value.length > 0 && value === value.trim(),
  'Expected a non-blank string without exterior whitespace.'
);
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/, 'Expected a lowercase SHA-256 hex digest.');
const Base64Schema = z
  .string()
  .min(4)
  .regex(
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
    'Expected canonical base64 without whitespace.'
  );

export const DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION = 'dvt-substrait-profile.v1' as const;
export const DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION =
  'dvt-substrait-semantic-document.v1' as const;
export const DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION =
  'dvt-substrait-authoring-sidecar.v1' as const;
export const DVT_SUBSTRAIT_PROFILE_ID = 'dvt.vtx2.substrait.v1' as const;
export const DVT_SUBSTRAIT_SPEC_VERSION = '0.101.0' as const;
export const DVT_SUBSTRAIT_SPEC_TAG = 'v0.101.0' as const;
export const DVT_SUBSTRAIT_SPEC_COMMIT_SHA =
  '2653e55516c8c07529cde9bc81c64e4ae3537515' as const;
export const DVT_SUBSTRAIT_PLAN_ENCODING = 'substrait-plan-protobuf-base64' as const;

/**
 * Tool versions proven viable by the VTX2 Substrait spike. They are profile
 * build coordinates, not a second semantic authority. Product packages do not
 * need to depend on these tools until a concrete adapter generates/decodes
 * Substrait Plan messages.
 */
export const DVT_SUBSTRAIT_PROTOBUF_TOOLCHAIN = {
  runtime: '@bufbuild/protobuf@2.14.0',
  generator: '@bufbuild/protoc-gen-es@2.14.0',
  buf: '@bufbuild/buf@1.72.0',
} as const;

/**
 * Admission metadata only. The names refer to the exact upstream protobuf
 * concepts in v0.101.0; DVT does not define replacement classes for them.
 */
export const DVT_SUBSTRAIT_VTX2_LOGICAL_RELATIONS = [
  'ReadRel',
  'ProjectRel',
  'FilterRel',
  'JoinRel',
  'SetRel',
  'AggregateRel',
  'SortRel',
  'FetchRel',
] as const;

export const DVT_SUBSTRAIT_VTX2_EXPRESSION_FAMILIES = [
  'FieldReference',
  'Literal',
  'ScalarFunction',
  'Cast',
  'IfThen',
  'AggregateFunction',
  'WindowFunction',
] as const;

export const DVT_SUBSTRAIT_VTX2_PROFILE = {
  schemaVersion: DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION,
  profileId: DVT_SUBSTRAIT_PROFILE_ID,
  spec: {
    version: DVT_SUBSTRAIT_SPEC_VERSION,
    tag: DVT_SUBSTRAIT_SPEC_TAG,
    commitSha: DVT_SUBSTRAIT_SPEC_COMMIT_SHA,
    planProto: 'proto/substrait/plan.proto',
  },
  protobufToolchain: DVT_SUBSTRAIT_PROTOBUF_TOOLCHAIN,
  logicalRelations: DVT_SUBSTRAIT_VTX2_LOGICAL_RELATIONS,
  expressionFamilies: DVT_SUBSTRAIT_VTX2_EXPRESSION_FAMILIES,
  typeAuthority: 'substrait.Type',
  functionAuthority: 'substrait.extensions',
  failClosedGaps: ['cardinality-changing-table-functions'],
} as const;

export const DVT_SUBSTRAIT_PROFILE_REF_V1 = {
  schemaVersion: DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION,
  profileId: DVT_SUBSTRAIT_PROFILE_ID,
  specVersion: DVT_SUBSTRAIT_SPEC_VERSION,
  specCommitSha: DVT_SUBSTRAIT_SPEC_COMMIT_SHA,
} as const;

const DvtSubstraitProfileCoordinatesSchema = z
  .object({
    schemaVersion: z.string(),
    profileId: z.string(),
    specVersion: z.string(),
    specCommitSha: z.string(),
  })
  .strict();

export const DvtSubstraitProfileRefV1Schema = z
  .object({
    schemaVersion: z.literal(DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION),
    profileId: z.literal(DVT_SUBSTRAIT_PROFILE_ID),
    specVersion: z.literal(DVT_SUBSTRAIT_SPEC_VERSION),
    specCommitSha: z.literal(DVT_SUBSTRAIT_SPEC_COMMIT_SHA),
  })
  .strict();

export const DvtSubstraitSemanticPlanV1Schema = z
  .object({
    encoding: z.literal(DVT_SUBSTRAIT_PLAN_ENCODING),
    bytesBase64: Base64Schema,
    sha256: Sha256Schema,
  })
  .strict()
  .superRefine((plan, context) => {
    const actualSha256 = sha256Hex(base64Bytes(plan.bytesBase64));
    if (actualSha256 !== plan.sha256) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic Plan SHA-256 does not match the serialized Substrait bytes.',
        path: ['sha256'],
      });
    }
  });

export const DvtSubstraitRelationBindingV1Schema = z
  .object({
    relationId: NonBlankStringSchema,
    relAnchor: z.number().int().positive().max(0xffffffff),
    sourceRef: ConnectedSourceRefSchema.optional(),
    displayName: NonBlankStringSchema.optional(),
  })
  .strict();

export const DvtSubstraitFieldBindingV1Schema = z
  .object({
    fieldId: NonBlankStringSchema,
    relationId: NonBlankStringSchema,
    outputOrdinal: z.number().int().nonnegative(),
    displayName: NonBlankStringSchema.optional(),
  })
  .strict();

export const DvtSubstraitAuthoringSidecarV1Schema = z
  .object({
    schemaVersion: z.literal(DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION),
    semanticPlanSha256: Sha256Schema,
    relations: z.array(DvtSubstraitRelationBindingV1Schema).min(1),
    fields: z.array(DvtSubstraitFieldBindingV1Schema),
  })
  .strict()
  .superRefine((sidecar, context) => {
    const relationIds = new Set<string>();
    const relAnchors = new Set<number>();

    sidecar.relations.forEach((relation, index) => {
      if (relationIds.has(relation.relationId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate relationId ${relation.relationId}.`,
          path: ['relations', index, 'relationId'],
        });
      }
      relationIds.add(relation.relationId);

      if (relAnchors.has(relation.relAnchor)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate Substrait rel_anchor ${relation.relAnchor}.`,
          path: ['relations', index, 'relAnchor'],
        });
      }
      relAnchors.add(relation.relAnchor);
    });

    const fieldIds = new Set<string>();
    const outputPositions = new Set<string>();

    sidecar.fields.forEach((field, index) => {
      if (fieldIds.has(field.fieldId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate fieldId ${field.fieldId}.`,
          path: ['fields', index, 'fieldId'],
        });
      }
      fieldIds.add(field.fieldId);

      if (!relationIds.has(field.relationId)) {
        context.addIssue({
          code: 'custom',
          message: `Unknown relationId ${field.relationId}.`,
          path: ['fields', index, 'relationId'],
        });
      }

      const outputPosition = `${field.relationId}:${field.outputOrdinal}`;
      if (outputPositions.has(outputPosition)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate output ordinal ${field.outputOrdinal} for ${field.relationId}.`,
          path: ['fields', index, 'outputOrdinal'],
        });
      }
      outputPositions.add(outputPosition);
    });
  });

export const DvtSubstraitSemanticDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION),
    profile: DvtSubstraitProfileRefV1Schema,
    semanticPlan: DvtSubstraitSemanticPlanV1Schema,
    sidecar: DvtSubstraitAuthoringSidecarV1Schema,
  })
  .strict()
  .superRefine((document, context) => {
    if (document.sidecar.semanticPlanSha256 !== document.semanticPlan.sha256) {
      context.addIssue({
        code: 'custom',
        message: 'Authoring sidecar is bound to a different semantic Plan digest.',
        path: ['sidecar', 'semanticPlanSha256'],
      });
    }
  });

export type DvtSubstraitProfileRefV1 = z.infer<typeof DvtSubstraitProfileRefV1Schema>;
export type DvtSubstraitSemanticPlanV1 = z.infer<typeof DvtSubstraitSemanticPlanV1Schema>;
export type DvtSubstraitRelationBindingV1 = z.infer<
  typeof DvtSubstraitRelationBindingV1Schema
>;
export type DvtSubstraitFieldBindingV1 = z.infer<typeof DvtSubstraitFieldBindingV1Schema>;
export type DvtSubstraitAuthoringSidecarV1 = z.infer<
  typeof DvtSubstraitAuthoringSidecarV1Schema
>;
export type DvtSubstraitSemanticDocumentV1 = z.infer<
  typeof DvtSubstraitSemanticDocumentV1Schema
>;

export type DvtSubstraitProfileCompatibility =
  | { status: 'compatible' }
  | {
      status: 'incompatible';
      reason:
        | 'malformed-profile-ref'
        | 'schema-version-mismatch'
        | 'profile-id-mismatch'
        | 'spec-version-mismatch'
        | 'spec-commit-mismatch';
    };

/**
 * Report profile skew as compatibility, not as semantic-plan corruption.
 * Decoding/semantic validation belongs to the adapter using the pinned proto.
 */
export function evaluateDvtSubstraitProfileCompatibility(
  input: unknown
): DvtSubstraitProfileCompatibility {
  const candidate = DvtSubstraitProfileCoordinatesSchema.safeParse(input);
  if (!candidate.success) {
    return { status: 'incompatible', reason: 'malformed-profile-ref' };
  }
  if (candidate.data.schemaVersion !== DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION) {
    return { status: 'incompatible', reason: 'schema-version-mismatch' };
  }
  if (candidate.data.profileId !== DVT_SUBSTRAIT_PROFILE_ID) {
    return { status: 'incompatible', reason: 'profile-id-mismatch' };
  }
  if (candidate.data.specVersion !== DVT_SUBSTRAIT_SPEC_VERSION) {
    return { status: 'incompatible', reason: 'spec-version-mismatch' };
  }
  if (candidate.data.specCommitSha !== DVT_SUBSTRAIT_SPEC_COMMIT_SHA) {
    return { status: 'incompatible', reason: 'spec-commit-mismatch' };
  }
  return { status: 'compatible' };
}

export function canonicalizeDvtSubstraitSemanticDocumentV1(
  input: unknown
): DvtSubstraitSemanticDocumentV1 {
  return DvtSubstraitSemanticDocumentV1Schema.parse(input);
}

export function serializeDvtSubstraitSemanticDocumentV1(input: unknown): string {
  return JSON.stringify(canonicalizeDvtSubstraitSemanticDocumentV1(input));
}
