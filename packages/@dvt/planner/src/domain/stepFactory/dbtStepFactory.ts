/**
 * Default dbt-compatible step factory.
 * ADR baseline: ADR-0006-extensibility
 */
import type { DbtStepTypeConfig } from '@dvt/contracts';

import { type ExecutionStepV1, type GraphNode, type ResolvedPolicies } from '../types.js';

import type { StepFactory } from './StepFactory.js';

function policyConfig(resolved: ResolvedPolicies): DbtStepTypeConfig {
  const config: DbtStepTypeConfig = {};

  if (resolved.stepTimeoutMs !== undefined) {
    config.stepTimeoutMs = resolved.stepTimeoutMs;
  }
  if (resolved.retries !== undefined) {
    config.retries = resolved.retries;
  }
  if (resolved.concurrency !== undefined) {
    config.concurrency = resolved.concurrency;
  }

  return config;
}

export const dbtStepFactory: StepFactory = (
  node: GraphNode,
  resolvedPolicies: ResolvedPolicies
): ExecutionStepV1 => {
  const mergedStepTypeConfig: Record<string, unknown> = {
    ...(node.stepTypeConfig ?? {}),
  };
  const resolvedConfig = policyConfig(resolvedPolicies);

  if ('stepTimeoutMs' in resolvedConfig) {
    mergedStepTypeConfig['stepTimeoutMs'] = resolvedConfig['stepTimeoutMs'];
  } else {
    delete mergedStepTypeConfig['stepTimeoutMs'];
  }

  if ('retries' in resolvedConfig) {
    mergedStepTypeConfig['retries'] = resolvedConfig['retries'];
  } else {
    delete mergedStepTypeConfig['retries'];
  }

  if ('concurrency' in resolvedConfig) {
    mergedStepTypeConfig['concurrency'] = resolvedConfig['concurrency'];
  } else {
    delete mergedStepTypeConfig['concurrency'];
  }

  return {
    stepId: node.nodeId,
    kind: node.stepKind,
    dependsOn: node.dependsOn,
    stepTypeConfig: mergedStepTypeConfig,
  };
};
