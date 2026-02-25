import type { PlannerInputEnvelopeV2 } from '../../src/domain/types.js';

export const FIXED_VECTOR: PlannerInputEnvelopeV2 = {
  nodes: [
    { nodeId: 'model.a', resourceType: 'model', dependsOn: [] },
    { nodeId: 'model.b', resourceType: 'model', dependsOn: ['model.a'] },
  ],
  selection: { selectedNodeIds: ['model.b'], includeUpstream: true },
  policies: {
    stepTimeoutMs: 60_000,
    retries: { maxAttempts: 3, backoffMs: 1_000 },
  },
  observability: { tags: { tenant: 'test' } },
  requestedBy: 'user',
  requestId: 'req-1',
  requestedAtIso: '2026-02-24T00:00:00.000Z',
};
