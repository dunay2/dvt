import type { ExecutionPlan, IStepTypeRegistry } from '@dvt/contracts';
import { PlanVerifierError, parseAndVerifyStepTypeConfigsOrThrow } from '@dvt/plan-verifier';

export function parseStoredExecutablePlan(
  bytes: Uint8Array,
  options?: {
    readonly stepTypeRegistry?: IStepTypeRegistry;
    readonly rejectUnknownStepKinds?: boolean;
  }
): ExecutionPlan {
  try {
    return parseAndVerifyStepTypeConfigsOrThrow({
      input: JSON.parse(Buffer.from(bytes).toString('utf8')),
      ...(options?.stepTypeRegistry === undefined
        ? {}
        : { stepTypeRegistry: options.stepTypeRegistry }),
      ...(options?.rejectUnknownStepKinds === undefined
        ? {}
        : { rejectUnknownStepKinds: options.rejectUnknownStepKinds }),
    });
  } catch (error) {
    if (error instanceof PlanVerifierError) {
      throw new Error(`${error.code}: ${error.message}`, { cause: error });
    }
    throw new Error('INVALID_EXECUTABLE_PLAN', { cause: error });
  }
}
