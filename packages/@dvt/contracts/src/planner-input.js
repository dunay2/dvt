'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.PlannerInputEnvelopeSchema =
  exports.WorkflowStepSchema =
  exports.WorkflowStepTypeSchema =
    void 0;
const zod_1 = require('zod');
exports.WorkflowStepTypeSchema = zod_1.z.enum(['task', 'gateway']);
exports.WorkflowStepSchema = zod_1.z.object({
  stepId: zod_1.z.string().min(1),
  type: exports.WorkflowStepTypeSchema,
  dependsOn: zod_1.z.array(zod_1.z.string()),
  gateway: zod_1.z
    .object({
      dslVersion: zod_1.z.literal('1.0'),
      expression: zod_1.z.string().min(1),
    })
    .optional(),
});
exports.PlannerInputEnvelopeSchema = zod_1.z.object({
  version: zod_1.z.literal('1.0'),
  workflowSpec: zod_1.z.object({
    workflowId: zod_1.z.string().min(1),
    steps: zod_1.z.array(exports.WorkflowStepSchema).min(1),
  }),
  executionIntent: zod_1.z.object({
    type: zod_1.z.enum(['full', 'partial', 'resume']),
    selection: zod_1.z.array(zod_1.z.string()).optional(),
  }),
  environment: zod_1.z.object({
    target: zod_1.z.enum(['production', 'staging', 'test']),
  }),
  engineHints: zod_1.z
    .object({
      requiredCapabilities: zod_1.z.array(zod_1.z.string()),
    })
    .optional(),
});
//# sourceMappingURL=planner-input.js.map
