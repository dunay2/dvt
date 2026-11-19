/**
 * Owned concern: define DBT step configuration using the common execution options.
 * @baseline ADR-0018: shared artifact identity is independent of executor configuration.
 * @decision Reuse common step options without owning artifact-reference validation.
 * @consequence Non-DBT consumers import artifact contracts from their neutral owner.
 * @version 1.0.0
 */
import { z } from 'zod';

import { CommonStepTypeConfigSchema } from './CommonStepTypeConfig.js';

export { CommonStepTypeConfigSchema } from './CommonStepTypeConfig.js';

export interface DbtStepTypeConfig extends Record<string, unknown> {
  parameterSetSha256?: string;
  dbtInvocationSha256?: string;
  stepTimeoutMs?: number;
  concurrency?: {
    maxInFlight: number;
  };
  custom?: Record<string, unknown>;
}

const digest = z.string().regex(/^[a-f0-9]{64}$/u);
export const DbtStepTypeConfigSchema = CommonStepTypeConfigSchema.extend({
  parameterSetSha256: digest.optional(),
  dbtInvocationSha256: digest.optional(),
}).refine(
  (step) => (step.parameterSetSha256 === undefined) === (step.dbtInvocationSha256 === undefined),
  'Parameterized dbt execution requires both parameter and invocation digests.'
);
