/**
 * Default dbt-compatible step factory.
 * ADR baseline: ADR-0006-extensibility
 */
import type { DbtStepTypeConfig } from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from '../errors.js';
import {
  DBT_MODEL,
  DBT_TEST,
  DBT_SNAPSHOT,
  type ExecutionStepV2,
  type GraphNode,
  type ResolvedPolicies,
} from '../types.js';

import type { StepFactory } from './StepFactory.js';

function kindForResourceType(resourceType: string): string {
  if (resourceType === 'model') return DBT_MODEL;
  if (resourceType === 'test') return DBT_TEST;
  if (resourceType === 'snapshot') return DBT_SNAPSHOT;
  throw new PlannerError(
    PlannerErrorCode.UNKNOWN_RESOURCE_TYPE,
    `Unknown resourceType for dbtStepFactory: "${resourceType}". Expected one of: model, test, snapshot.`
  );
}

function policyConfig(resolved: ResolvedPolicies): DbtStepTypeConfig {
  return {
    stepTimeoutMs: resolved.stepTimeoutMs,
    retries: resolved.retries,
    concurrency: resolved.concurrency,
    custom: resolved.custom,
  };
}

export const dbtStepFactory: StepFactory = (
  node: GraphNode,
  resolvedPolicies: ResolvedPolicies
): ExecutionStepV2 => {
  const kind = kindForResourceType(node.resourceType);
  return {
    stepId: node.nodeId,
    kind,
    dependsOn: node.dependsOn,
    stepTypeConfig: policyConfig(resolvedPolicies),
  };
};
