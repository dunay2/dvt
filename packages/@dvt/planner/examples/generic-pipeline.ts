import { Planner } from '../src/domain/Planner.js';
import type { StepFactory } from '../src/domain/stepFactory/StepFactory.js';
import type { GraphNode, PlannerInputEnvelopeV1, ResolvedPolicies } from '../src/domain/types.js';

const genericStepFactory: StepFactory = (node: GraphNode, resolved: ResolvedPolicies) => {
  // Example: use arbitrary kind and pass custom config
  return {
    stepId: node.nodeId,
    kind: node.resourceType, // e.g. EXTRACT / TRANSFORM / LOAD
    dependsOn: node.dependsOn,
    stepTypeConfig: {
      timeoutMs: resolved.stepTimeoutMs,
      retries: resolved.retries,
    },
  };
};

async function main(): Promise<void> {
  const planner = new Planner({
    stepFactory: genericStepFactory,
    limits: { maxNodes: 10_000, timeoutMs: 10_000 },
  });

  const input: PlannerInputEnvelopeV1 = {
    nodes: [
      { nodeId: 'extract.s3', resourceType: 'EXTRACT', dependsOn: [] },
      { nodeId: 'transform.clean', resourceType: 'TRANSFORM', dependsOn: ['extract.s3'] },
      { nodeId: 'load.warehouse', resourceType: 'LOAD', dependsOn: ['transform.clean'] },
    ],
    selection: { selectedNodeIds: ['load.warehouse'], includeUpstream: true },
    policies: {
      retry: { kind: 'at-most-N', maxAttempts: 2 },
      timeout: { kind: 'budget', maxSeconds: 30 },
    },
    observability: { tags: { tenant: 'lab' }, extra: { domain: 'generic-pipeline' } },
  };

  const { plan } = await planner.buildPlan(input);
  console.warn(plan.metadata.planId);
}

void main();
