import { z } from 'zod';

export const WorkflowStepTypeSchema = z.enum(['task', 'gateway']);

export const WorkflowStepSchema = z.object({
  stepId: z.string().min(1),
  type: WorkflowStepTypeSchema,
  dependsOn: z.array(z.string()),
  gateway: z
    .object({
      dslVersion: z.literal('1.0'),
      expression: z.string().min(1),
    })
    .optional(),
});

export const PlannerInputEnvelopeSchema = z.object({
  version: z.literal('1.0'),
  workflowSpec: z.object({
    workflowId: z.string().min(1),
    steps: z.array(WorkflowStepSchema).min(1),
  }),
  executionIntent: z.object({
    type: z.enum(['full', 'partial', 'resume']),
    selection: z.array(z.string()).optional(),
  }),
  environment: z.object({
    target: z.enum(['production', 'staging', 'test']),
  }),
  engineHints: z
    .object({
      requiredCapabilities: z.array(z.string()),
    })
    .optional(),
});

export type PlannerInputEnvelope = z.infer<typeof PlannerInputEnvelopeSchema>;
