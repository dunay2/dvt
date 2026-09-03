/** Owned concern: encode and decode a validated DVT Substrait authoring draft. */
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { base64Bytes, sha256Hex } from '@dvt/crypto';
import {
  DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  canonicalizeDvtSubstraitSemanticDocumentV1,
  type DvtSubstraitAuthoringSidecarV1,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

export type DvtSubstraitSemanticDraft = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeDvtSubstraitSemanticDraft(input: unknown): DvtSubstraitSemanticDraft {
  const document = canonicalizeDvtSubstraitSemanticDocumentV1(input);
  return {
    plan: fromBinary(PlanSchema, base64Bytes(document.semanticPlan.bytesBase64)),
    sidecar: document.sidecar,
  };
}

export function encodeDvtSubstraitSemanticDraft(
  draft: DvtSubstraitSemanticDraft,
  isValid: (candidate: DvtSubstraitSemanticDraft) => boolean,
  invalidMessage: string
): DvtSubstraitSemanticDocumentV1 {
  if (!isValid(draft)) throw new Error(invalidMessage);
  const bytes = toBinary(PlanSchema, draft.plan);
  const sha256 = sha256Hex(bytes);
  return canonicalizeDvtSubstraitSemanticDocumentV1({
    schemaVersion: DVT_SUBSTRAIT_SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
    semanticPlan: {
      encoding: DVT_SUBSTRAIT_PLAN_ENCODING,
      bytesBase64: bytesToBase64(bytes),
      sha256,
    },
    sidecar: {
      ...draft.sidecar,
      schemaVersion: DVT_SUBSTRAIT_AUTHORING_SIDECAR_SCHEMA_VERSION,
      semanticPlanSha256: sha256,
    },
  });
}
