/**
 * @ownedConcern Validate runtime step shape and derive activity execution identity.
 */
import type { ResolvedRunContext } from '@dvt/contracts';
import { Context } from '@temporalio/activity';

import { ActivityErrorCode } from './activityFailures.js';
import type { StepDefinition, StepExecutionIdentity } from './activityTypes.js';

const ALLOWED_STEP_FIELDS = new Set([
  'stepId',
  'kind',
  'type',
  'gateway',
  'stepTypeConfig',
  'dependsOn',
  'retryPolicy',
]);

export function resolveTemporalAttemptFromContext(): number {
  try {
    const attempt = Context.current().info.attempt;
    return Number.isInteger(attempt) && attempt > 0 ? attempt : 1;
  } catch {
    return 1;
  }
}

export function toStepExecutionIdentity(ctx: ResolvedRunContext): StepExecutionIdentity {
  return {
    tenantId: ctx.tenantId,
    runId: ctx.runId,
    environmentId: ctx.environmentId,
  };
}

export function validateStepShape(step: StepDefinition): void {
  if (Object.keys(step).includes('inputBindings')) {
    throw new TypeError(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: inputBindings_not_supported_in_v1`
    );
  }

  for (const fieldName of Object.keys(step)) {
    if (!ALLOWED_STEP_FIELDS.has(fieldName)) {
      throw new TypeError(
        `${ActivityErrorCode.INVALID_STEP_SCHEMA}: field_not_allowed:${fieldName}`
      );
    }
  }

  if (!Array.isArray(step.dependsOn) && step.dependsOn !== undefined) {
    throw new TypeError(`${ActivityErrorCode.INVALID_STEP_SCHEMA}: dependsOn_must_be_array`);
  }

  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new TypeError(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: dependsOn_values_must_be_string`
    );
  }
}
