/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowGatewayHelpers.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Validate and evaluate gateway dependencies from canonical execution-plan facts
 * @consequence Temporal workflows cannot invent gateway semantics outside DVT plan interpretation
 * @version 1.2.0
 */
import type { MaterializationEvidence } from '@dvt/contracts';

export function normalizeDependsOn(dependsOn: unknown): string[] {
  if (!Array.isArray(dependsOn)) {
    return [];
  }

  return dependsOn.filter((dependency): dependency is string => {
    return typeof dependency === 'string' && dependency.trim().length > 0;
  });
}

export function validateGatewayDependencies(
  steps: ReadonlyArray<{ stepId: string; type?: unknown; dependsOn?: unknown }>
): void {
  for (const step of steps) {
    if (step.type !== 'gateway') {
      continue;
    }

    const dependencies = normalizeDependsOn(step.dependsOn);
    if (dependencies.length !== 1) {
      throw new TypeError(
        `INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:${step.stepId}`
      );
    }
  }
}

export function buildGatewayContext(
  step: { stepId: string; dependsOn?: unknown },
  completedStepResults: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const dependencies = normalizeDependsOn(step.dependsOn);
  if (dependencies.length !== 1) {
    throw new TypeError(
      `INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:${step.stepId}`
    );
  }

  const dependencyStepId = dependencies[0];
  if (dependencyStepId === undefined) {
    throw new TypeError(
      `INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:${step.stepId}`
    );
  }

  return resolveGatewayDependencyContext(dependencyStepId, completedStepResults);
}

export function resolveGatewayDependencyContext(
  dependencyStepId: string,
  completedStepResults: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const fromDependency = completedStepResults[dependencyStepId];
  return fromDependency ?? buildCompletedStepFact(dependencyStepId);
}

export function buildCompletedStepFact(
  stepId: string,
  gatewayDecision?: boolean,
  resultEvidence?: MaterializationEvidence
): Record<string, unknown> {
  const fact: Record<string, unknown> = { stepId, status: 'COMPLETED' };

  if (typeof gatewayDecision === 'boolean') {
    fact['gatewayDecision'] = gatewayDecision;
  }

  if (resultEvidence !== undefined) {
    fact['resultEvidence'] = resultEvidence;
  }

  return fact;
}
