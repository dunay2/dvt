/**
 * Owned concern: pin the first DVT Substrait semantic profile and define the
 * identity-only authoring sidecar that binds stable DVT relation/field ids to
 * one exact serialized Substrait Plan.
 *
 * This contract does not redefine Substrait relations, expressions, types,
 * functions, or capability admission. Those semantics remain upstream and the
 * admitted capability catalog is owned separately by SUB1. This boundary
 * persists profile coordinates, opaque canonical Plan bytes, and only the DVT
 * identity/provenance information required for editable cards.
 *
 * SQL rendering, SQL parsing, provider validation, planning, and runtime
 * execution remain outside this boundary.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Pin one exact Substrait release and map stable DVT ids to rel_anchor/output ordinals.
 * @consequence Rename/reorder/reload can preserve identity without a private DVT relational IR.
 * @version 1.0.0
 */
import { z } from 'zod';

export const DVT_SUBSTRAIT_PROFILE_SCHEMA_VERSION = 'dvt-substrait-profile.v1' as const;
export const DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION =
  'dvt-substrait-semantic-document.v1' as const;
export const DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION =
  'dvt-substrait-authoring-sidecar.v1' as const;
export const DVT_SUBSTRAIT_PROFILE_ID = 'dvt.vtx2.substrait.v1' as const;
export const DVT_SUBSTRAIT_SPEC_VERSION = '0.101.0' as const;
export const DVT_SUBSTRAIT_SPEC_TAG = 'v0.101.0' as const;
export const DVT_SUBSTRAIT_SPEC_COMMIT_SHA = '2653e55516c8c07529cde9bc81c64e4ae3537515' as const;
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
 * Exact implementation pin only. Capability membership is intentionally not
 * repeated here: #2640 owns the single machine-readable semantic catalog.
 */
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

export type DvtSubstraitProfileRefV1 = z.infer<typeof DvtSubstraitProfileRefV1Schema>;

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
