import { describe, expect, it } from 'vitest';

import {
  buildPlanRefStartRunCommand,
  buildPlannerBackedStartRunCommand,
} from '../../../src/entrypoints/http/startRunRouteCommandBuilder.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/p.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'p1',
  planVersion: '1.0',
};

describe('startRun command builders', () => {
  it('builds planRef command', () => {
    expect(
      buildPlanRefStartRunCommand({
        rawPlanRef: VALID_PLAN_REF,
        runId: 'run-1',
        targetAdapter: 'mock',
        selection: ['model_a'],
      })
    ).toEqual({
      ok: true,
      value: {
        planRef: VALID_PLAN_REF,
        runId: 'run-1',
        targetAdapter: 'mock',
        selection: ['model_a'],
      },
    });
  });

  it('builds planner-backed command', () => {
    expect(
      buildPlannerBackedStartRunCommand({
        record: {
          graphSource: {
            kind: 'normalized-graph-v1',
            nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
          },
        },
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: ['model_a'],
      })
    ).toEqual({
      ok: true,
      value: {
        graphSource: {
          kind: 'normalized-graph-v1',
          nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
        },
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: ['model_a'],
      },
    });
  });

  it('propagates planRef parse issues', () => {
    expect(
      buildPlanRefStartRunCommand({
        rawPlanRef: { uri: 'https://plans.example.com/p.json' },
        runId: 'run-1',
        targetAdapter: 'mock',
        selection: ['model_a'],
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });

  it('propagates planner envelope parse issues', () => {
    expect(
      buildPlannerBackedStartRunCommand({
        record: { graphSource: { kind: 'bad' } },
        runId: 'run-1',
        targetAdapter: 'temporal',
        selection: ['model_a'],
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });
});
