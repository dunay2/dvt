import { describe, expect, it } from 'vitest';

import { evaluatePlanRoutePlanSource } from '../../../src/entrypoints/http/planRoutePlanSourcePolicy.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/p.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'p1',
  planVersion: '1.0',
};

describe('evaluatePlanRoutePlanSource', () => {
  it('accepts planRef-only source', () => {
    expect(evaluatePlanRoutePlanSource({ planRef: VALID_PLAN_REF })).toEqual({
      ok: true,
      value: { kind: 'planRef' },
    });
  });

  it('accepts planner-backed source with a single planner source', () => {
    expect(
      evaluatePlanRoutePlanSource({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
      })
    ).toEqual({
      ok: true,
      value: { kind: 'plannerBacked' },
    });
  });

  it('rejects planRef with planner-backed sources', () => {
    expect(
      evaluatePlanRoutePlanSource({
        planRef: VALID_PLAN_REF,
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'conflicting_plan_inputs' },
    });
  });

  it('rejects planRef with planner-backed metadata', () => {
    expect(
      evaluatePlanRoutePlanSource({
        planRef: VALID_PLAN_REF,
        environment: {
          environmentId: 'prod',
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'conflicting_plan_inputs' },
    });
  });

  it('rejects missing planner source when planRef is absent', () => {
    expect(evaluatePlanRoutePlanSource({})).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('rejects planner metadata without graphSource when planRef is absent', () => {
    expect(
      evaluatePlanRoutePlanSource({
        observability: {
          tags: {
            route: 'start-run',
          },
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('rejects manifestRef as a forbidden planner source', () => {
    expect(
      evaluatePlanRoutePlanSource({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
        manifestRef: { uri: 's3://bucket/manifest.json', sha256: 'abc' },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('rejects legacy nodes payloads', () => {
    expect(
      evaluatePlanRoutePlanSource({
        nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('rejects legacy manifest payloads even when planRef is provided', () => {
    expect(
      evaluatePlanRoutePlanSource({
        planRef: VALID_PLAN_REF,
        manifest: { nodes: {} },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });
});
