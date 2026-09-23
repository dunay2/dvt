/** Decoded authority, not a second relational representation. */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { DvtSubstraitAuthoringSidecarV1 } from '@dvt/contracts';

export type SubstraitDocument = Readonly<{
  plan: Plan;
  sidecar: DvtSubstraitAuthoringSidecarV1;
}>;

export class SubstraitAnalysisError extends Error {
  constructor(
    readonly code:
      | 'invalid_structure'
      | 'invalid_binding'
      | 'unsupported_relation'
      | 'unknown_relation'
      | 'stale_document',
    message: string
  ) {
    super(message);
    this.name = 'SubstraitAnalysisError';
  }
}
