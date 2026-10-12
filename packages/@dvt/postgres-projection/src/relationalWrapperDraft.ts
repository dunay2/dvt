/** Reconstruction of a disposable base draft after an admitted wrapper is removed. */
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';

import { resolveFunctionReference } from './substrait-profile/functionReference.js';
import type { DvtSubstraitSetDraft } from './substraitSetReadModel.js';

type WrapperField = DvtSubstraitSetDraft['sidecar']['fields'][number];

export function removeFunction(plan: Plan, functionAnchor: number): void {
  const reference = resolveFunctionReference(plan, functionAnchor);
  if (!reference.ok)
    throw new Error(`Admitted wrapper lost its function reference: ${reference.reason}`);
  plan.extensions = plan.extensions.filter(
    (entry) =>
      entry.mappingType.case !== 'extensionFunction' ||
      entry.mappingType.value.functionAnchor !== functionAnchor
  );
  const urnAnchor = reference.value.urnAnchor;
  const stillReferenced = plan.extensions.some(
    (entry) => entry.mappingType.value?.extensionUrnReference === urnAnchor
  );
  if (!stillReferenced)
    plan.extensionUrns = plan.extensionUrns.filter(
      (entry) => entry.extensionUrnAnchor !== urnAnchor
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
    sidecar: { ...draft.sidecar, semanticPlanSha256: sha256Hex(toBinary(PlanSchema, draft.plan)) },
  };
}
