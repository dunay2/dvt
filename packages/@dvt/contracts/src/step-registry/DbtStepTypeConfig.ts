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
