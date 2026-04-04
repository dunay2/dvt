import { Planner } from '../src/domain/Planner.js';
import type { PlannerInputEnvelopeV1 } from '../src/domain/types.js';

async function main(): Promise<void> {
  const planner = new Planner();

  const input: PlannerInputEnvelopeV1 = {
    graphSource: {
      nodes: [
        { nodeId: 'model.stg_orders', resourceType: 'model', dependsOn: [] },
        { nodeId: 'model.fct_orders', resourceType: 'model', dependsOn: ['model.stg_orders'] },
        { nodeId: 'test.fct_orders_not_null', resourceType: 'test', dependsOn: ['model.fct_orders'] },
      ],
    },
    selection: { selectedNodeIds: ['test.fct_orders_not_null'], includeUpstream: true },
    policies: {
      retry: { kind: 'at-most-N', maxAttempts: 3 },
      timeout: { kind: 'budget', maxSeconds: 60 },
      concurrency: { kind: 'bounded', maxParallel: 64 },
    },
    observability: {
      tags: { tenant: 'acme', env: 'prod' },
      extra: { dbtInvocationId: 'abc-123' },
    },
    requestedBy: 'user-1',
    requestId: 'req-1',
  };

  const { plan, canonicalPlanJson } = await planner.buildPlan(input);
  console.warn(plan.metadata.planId);
  console.warn(canonicalPlanJson.length);
}

void main();
