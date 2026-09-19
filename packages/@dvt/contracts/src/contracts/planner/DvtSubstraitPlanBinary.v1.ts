/**
 * Owned concern: decode the exact protobuf Plan admitted by the pinned DVT
 * Substrait profile.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Fail closed when persisted bytes are not one decodable Plan at the pinned version.
 * @version 1.0.0
 */
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { fromBinary, toBinary } from '@bufbuild/protobuf';
import { base64Bytes, sha256Hex } from '@dvt/crypto';

import {
  DVT_SUBSTRAIT_PLAN_ENCODING,
  DVT_SUBSTRAIT_SPEC_VERSION,
} from './DvtSubstraitProfile.v1.js';
import type {
  DvtSubstraitSemanticDocumentV1,
  DvtSubstraitSemanticPlanV1,
} from './DvtSubstraitSemanticDocument.v1.js';

const [PINNED_MAJOR, PINNED_MINOR, PINNED_PATCH] =
  DVT_SUBSTRAIT_SPEC_VERSION.split('.').map(Number);

function assertPinnedDvtSubstraitPlanV1(plan: Plan): void {
  const version = plan.version;
  if (
    version === undefined ||
    version.majorNumber !== PINNED_MAJOR ||
    version.minorNumber !== PINNED_MINOR ||
    version.patchNumber !== PINNED_PATCH ||
    plan.relations.length === 0
  ) {
    throw new Error('Substrait Plan does not match the pinned DVT profile.');
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

export function decodeDvtSubstraitPlanV1(
  input: Pick<DvtSubstraitSemanticDocumentV1, 'semanticPlan'>
): Plan {
  const plan = fromBinary(PlanSchema, base64Bytes(input.semanticPlan.bytesBase64));
  assertPinnedDvtSubstraitPlanV1(plan);
  return plan;
}

export function encodeDvtSubstraitPlanV1(plan: Plan): DvtSubstraitSemanticPlanV1 {
  assertPinnedDvtSubstraitPlanV1(plan);
  const bytes = toBinary(PlanSchema, plan);
  return {
    encoding: DVT_SUBSTRAIT_PLAN_ENCODING,
    bytesBase64: bytesToBase64(bytes),
    sha256: sha256Hex(bytes),
  };
}
