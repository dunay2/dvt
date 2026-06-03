/**
 * @file packages/@dvt/contracts/src/contracts/planner/PlanCompileStepTypeConfigs.v1.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Define plan-compile step-type configuration schemas as explicit planner contract surface
 * @consequence Planner extensions validate through versioned contract schemas instead of ad hoc runtime payloads
 * @version 1.0.0
 */
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
