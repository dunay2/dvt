/**
 * Owned concern: define DBT step configuration using the common execution options.
 * @baseline ADR-0018: shared artifact identity is independent of executor configuration.
 * @decision Reuse common step options without owning artifact-reference validation.
 * @consequence Non-DBT consumers import artifact contracts from their neutral owner.
 * @version 1.0.0
 */
import { CommonStepTypeConfigSchema } from './CommonStepTypeConfig.js';

export { CommonStepTypeConfigSchema } from './CommonStepTypeConfig.js';

export interface DbtStepTypeConfig extends Record<string, unknown> {
  stepTimeoutMs?: number;
  concurrency?: {
    maxInFlight: number;
  };
  custom?: Record<string, unknown>;
}

export const DbtStepTypeConfigSchema = CommonStepTypeConfigSchema;
