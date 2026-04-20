import { z } from 'zod';

import { CommonStepTypeConfigSchema } from '../../step-registry/DbtStepTypeConfig.js';

export const SparkJobRuntimeSchema = z.enum(['python', 'scala']);
export const SparkJobDeployModeSchema = z.enum(['client', 'cluster']);

export const SparkJobStepTypeConfigSchema = CommonStepTypeConfigSchema.extend({
  application: z.string().min(1),
  entrypoint: z.string().min(1),
  runtime: SparkJobRuntimeSchema,
  arguments: z.array(z.string().min(1)).optional(),
  mainClass: z.string().min(1).optional(),
  deployMode: SparkJobDeployModeSchema.optional(),
}).strict();

export type SparkJobRuntime = z.infer<typeof SparkJobRuntimeSchema>;
export type SparkJobDeployMode = z.infer<typeof SparkJobDeployModeSchema>;
export type SparkJobStepTypeConfig = z.infer<typeof SparkJobStepTypeConfigSchema>;
