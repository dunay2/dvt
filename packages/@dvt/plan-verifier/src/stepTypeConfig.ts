import {
  createDefaultStepTypeRegistry,
  parseExecutionPlan,
  type ExecutionPlan,
  type IStepTypeRegistry,
} from '@dvt/contracts';

import { PlanVerifierError } from './errors.js';

export interface StepTypeConfigVerificationParams {
  plan: ExecutionPlan;
  stepTypeRegistry?: IStepTypeRegistry;
  rejectUnknownStepKinds?: boolean;
}

export interface ParseAndVerifyStepTypeConfigParams {
  input: unknown;
  stepTypeRegistry?: IStepTypeRegistry;
  rejectUnknownStepKinds?: boolean;
}

export function verifyStepTypeConfigsOrThrow(params: StepTypeConfigVerificationParams): void {
  const registry = params.stepTypeRegistry ?? createDefaultStepTypeRegistry();
  const rejectUnknownStepKinds = params.rejectUnknownStepKinds ?? true;

  for (const step of params.plan.steps) {
    if (!registry.isKnown(step.kind)) {
      if (rejectUnknownStepKinds) {
        throw new PlanVerifierError(
          'INVALID_STEP_KIND',
          `Unregistered step kind at admission boundary. stepId=${step.stepId} kind=${step.kind}`
        );
      }
      continue;
    }

    const validationResult = registry.validate(step.kind, step.stepTypeConfig);
    if (!validationResult.success) {
      throw new PlanVerifierError(
        'INVALID_STEP_TYPE_CONFIG',
        `Invalid stepTypeConfig. stepId=${step.stepId} kind=${step.kind} reason=${validationResult.error}`
      );
    }
  }
}

export function parseAndVerifyStepTypeConfigsOrThrow(
  params: ParseAndVerifyStepTypeConfigParams
): ExecutionPlan {
  let plan: ExecutionPlan;
  try {
    plan = parseExecutionPlan(params.input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new PlanVerifierError(
      'INVALID_STEP_TYPE_CONFIG',
      `Invalid ExecutionPlan payload. ${reason}`
    );
  }
  const verificationParams: StepTypeConfigVerificationParams = {
    plan,
    ...(params.stepTypeRegistry === undefined ? {} : { stepTypeRegistry: params.stepTypeRegistry }),
    ...(params.rejectUnknownStepKinds === undefined
      ? {}
      : { rejectUnknownStepKinds: params.rejectUnknownStepKinds }),
  };
  verifyStepTypeConfigsOrThrow({
    ...verificationParams,
  });
  return plan;
}
