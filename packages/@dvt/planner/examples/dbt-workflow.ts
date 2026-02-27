import { Planner } from '../src/domain/Planner.js';
import type { PlannerInputEnvelopeV2 } from '../src/domain/types.js';

async function main(): Promise<void> {
  const planner = new Planner();

  const input: PlannerInputEnvelopeV2 = {
    nodes: [
      { nodeId: 'model.stg_orders', resourceType: 'model', dependsOn: [] },
      { nodeId: 'model.fct_orders', resourceType: 'model', dependsOn: ['model.stg_orders'] },
      { nodeId: 'test.fct_orders_not_null', resourceType: 'test', dependsOn: ['model.fct_orders'] },
    ],
    selection: { selectedNodeIds: ['test.fct_orders_not_null'], includeUpstream: true },
    policies: {
      stepTimeoutMs: 60_000,
      retries: { maxAttempts: 3, backoffMs: 500 },
      concurrency: { maxInFlight: 64 },
      custom: { warehouse: 'WH_XS' },
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
