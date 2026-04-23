import { describe, expect, it } from 'vitest';

import {
  httpError,
  invokeStartRunRoute,
  okResult,
  VALID_BODY,
  VALID_GRAPH_SOURCE,
} from './startRunRoute.test.support.js';

const REJECTING_FACADE = {
  async execute() {
    throw new Error('should not be called');
  },
};

describe('startRunRoute plan-source policy', () => {
  it('accepts planner-backed selection when graph source contains the selected nodes', async () => {
    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({
          kind: 'accepted' as const,
          runId: 'r-empty-selection',
          accepted: true,
        });
      },
    };

    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-empty-selection',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          planRef: undefined,
          selection: { mode: 'explicit', nodeIds: ['model_a'] },
          graphSource: VALID_GRAPH_SOURCE,
          targetAdapter: 'mock',
        },
      },
      facade,
      runIdGenerator: () => 'run_generated_empty_selection',
    });

    expect(reply.statusCode).toBe(202);
    expect(reply.payload).toEqual({ runId: 'r-empty-selection', accepted: true });
    expect(received?.command).toEqual({
      graphSource: VALID_GRAPH_SOURCE,
      runId: 'run_generated_empty_selection',
      targetAdapter: 'mock',
      selection: { mode: 'explicit', nodeIds: ['model_a'] },
    });
  });

  it('accepts planner-backed starts with a typed graph source', async () => {
    let received: Record<string, unknown> | undefined;
    const facade = {
      async execute(input: Record<string, unknown>) {
        received = input;
        return okResult({ kind: 'accepted' as const, runId: 'r-graph', accepted: true });
      },
    };

    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-graph-source',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          planRef: undefined,
          graphSource: VALID_GRAPH_SOURCE,
          targetAdapter: 'mock',
        },
      },
      facade,
      runIdGenerator: () => 'run_generated_graph',
    });

    expect(reply.statusCode).toBe(202);
    expect(received?.command).toEqual({
      graphSource: VALID_GRAPH_SOURCE,
      runId: 'run_generated_graph',
      targetAdapter: 'mock',
      selection: { mode: 'explicit', nodeIds: ['model_a'] },
    });
  });

  const invalidPlanSourceCases = [
    {
      description: 'returns 400 when planRef and planner source are both supplied',
      body: {
        ...VALID_BODY,
        graphSource: VALID_GRAPH_SOURCE,
      },
      expectedReason: 'conflicting_plan_inputs',
    },
    {
      description: 'returns 400 when manifestRef is supplied on the hard-cut planner boundary',
      body: {
        ...VALID_BODY,
        manifestRef: {
          uri: 'dbt://manifest.json',
          sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
      },
      expectedReason: 'invalid_plan_source',
    },
    {
      description: 'returns 400 when legacy nodes payload is supplied',
      body: {
        ...VALID_BODY,
        nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
      },
      expectedReason: 'invalid_plan_source',
    },
    {
      description: 'returns 400 when legacy manifest payload is supplied',
      body: {
        ...VALID_BODY,
        manifest: { nodes: [] },
      },
      expectedReason: 'invalid_plan_source',
    },
    {
      description: 'returns 400 when legacy nodes payload is supplied without planRef',
      body: {
        ...VALID_BODY,
        planRef: undefined,
        nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
      },
      expectedReason: 'invalid_plan_source',
    },
    {
      description: 'returns 400 when legacy manifest payload is supplied without planRef',
      body: {
        ...VALID_BODY,
        planRef: undefined,
        manifest: { nodes: [] },
      },
      expectedReason: 'invalid_plan_source',
    },
  ] as const;

  it.each(invalidPlanSourceCases)('$description', async ({ body, expectedReason }) => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: `req-${expectedReason}`,
        body,
      },
      facade: REJECTING_FACADE,
    });

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual(httpError('bad_request', expectedReason));
  });
});
