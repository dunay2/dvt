/**
 * Owned concern: decode the exact protobuf Plan admitted by the pinned DVT
 * Substrait profile.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Fail closed when persisted bytes are not one decodable Plan at the pinned version.
 * @version 1.0.0
 */
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { fromBinary } from '@bufbuild/protobuf';
import { base64Bytes } from '@dvt/crypto';

import { DVT_SUBSTRAIT_SPEC_VERSION } from './DvtSubstraitProfile.v1.js';
import type { DvtSubstraitSemanticDocumentV1 } from './DvtSubstraitSemanticDocument.v1.js';

const [PINNED_MAJOR, PINNED_MINOR, PINNED_PATCH] =
  DVT_SUBSTRAIT_SPEC_VERSION.split('.').map(Number);

export function decodeDvtSubstraitPlanV1(
  input: Pick<DvtSubstraitSemanticDocumentV1, 'semanticPlan'>
): Plan {
  const plan = fromBinary(PlanSchema, base64Bytes(input.semanticPlan.bytesBase64));
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
  return plan;
}
