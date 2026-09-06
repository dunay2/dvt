import { z } from 'zod';

import { CommonStepTypeConfigSchema } from './CommonStepTypeConfig.js';

export { CommonStepTypeConfigSchema } from './CommonStepTypeConfig.js';

const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const StepArtifactRefSchema = z
  .object({
    artifactKind: z.string().min(1),
    sha256: HexSha256Schema,
    storageUri: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    encoding: z.literal('utf-8').optional(),
  })
  .strict();

export interface DbtStepTypeConfig extends Record<string, unknown> {
  stepTimeoutMs?: number;
  concurrency?: {
    maxInFlight: number;
  };
  custom?: Record<string, unknown>;
}

export const DbtStepTypeConfigSchema = CommonStepTypeConfigSchema;
