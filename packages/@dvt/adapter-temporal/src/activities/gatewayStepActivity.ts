/**
 * @ownedConcern Execute gateway DSL steps inside the activity boundary.
 */
import { evaluateDslV1, parseDslV1 } from '@dvt/dsl';

import { ActivityErrorCode, createPermanentStepFailure } from './activityFailures.js';
import type {
  StepActivity,
  StepDefinition,
  StepExecutionContext,
  StepResult,
} from './activityTypes.js';

export class GatewayStepActivity implements StepActivity {
  async execute(step: StepDefinition, context: StepExecutionContext): Promise<StepResult> {
    const gateway = parseGatewayConfigOrThrow(step);
    try {
      const parsed = parseDslV1(gateway.expression);
      const passed = evaluateDslV1(parsed, context.gatewayContext ?? {});
      return { stepId: step.stepId, status: 'COMPLETED', gatewayDecision: passed };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw createPermanentStepFailure(
        `${ActivityErrorCode.INVALID_GATEWAY_DSL}:${step.stepId}:${reason}`
      );
    }
  }
}

function parseGatewayConfigOrThrow(step: StepDefinition): {
  dslVersion: '1.0';
  expression: string;
} {
  const gateway = step.gateway;
  if (typeof gateway !== 'object' || gateway === null) {
    throw createPermanentStepFailure(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_config_required:${step.stepId}`
    );
  }

  const value = gateway as Record<string, unknown>;
  if (value['dslVersion'] !== '1.0') {
    throw createPermanentStepFailure(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_dsl_version:${step.stepId}`
    );
  }

  const expression = value['expression'];
  if (typeof expression !== 'string' || expression.trim().length === 0) {
    throw createPermanentStepFailure(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_expression:${step.stepId}`
    );
  }

  return { dslVersion: '1.0', expression };
}
