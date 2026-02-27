import { Planner } from '../src/domain/Planner.js';
import type { StepFactory } from '../src/domain/stepFactory/StepFactory.js';
import type { GraphNode, PlannerInputEnvelopeV2, ResolvedPolicies } from '../src/domain/types.js';

const genericStepFactory: StepFactory = (node: GraphNode, resolved: ResolvedPolicies) => {
  // Example: use arbitrary kind and pass custom config
  return {
    stepId: node.nodeId,
    kind: node.resourceType, // e.g. EXTRACT / TRANSFORM / LOAD
    dependsOn: node.dependsOn,
    stepTypeConfig: {
      timeoutMs: resolved.stepTimeoutMs,
      retries: resolved.retries,
      custom: resolved.custom,
    },
  };
};

async function main(): Promise<void> {
  const planner = new Planner({
    stepFactory: genericStepFactory,
    limits: { maxNodes: 10_000, timeoutMs: 10_000 },
  });

  const input: PlannerInputEnvelopeV2 = {
    nodes: [
      { nodeId: 'extract.s3', resourceType: 'EXTRACT', dependsOn: [] },
      { nodeId: 'transform.clean', resourceType: 'TRANSFORM', dependsOn: ['extract.s3'] },
      { nodeId: 'load.warehouse', resourceType: 'LOAD', dependsOn: ['transform.clean'] },
    ],
    selection: { selectedNodeIds: ['load.warehouse'], includeUpstream: true },
    policies: {
      stepTimeoutMs: 30_000,
      retries: { maxAttempts: 2, backoffMs: 200 },
      custom: { dataset: 'events', tenant: 'lab' },
    },
    observability: { tags: { tenant: 'lab' }, extra: { domain: 'generic-pipeline' } },
  };

  const { plan } = await planner.buildPlan(input);
  console.warn(plan.metadata.planId);
}

void main();
