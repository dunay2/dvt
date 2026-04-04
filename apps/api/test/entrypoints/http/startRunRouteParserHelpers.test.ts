import { describe, expect, it } from 'vitest';

import { parseStartRunBodyRecord } from '../../../src/entrypoints/http/startRunRouteBodyValidation.js';
import { parseStartRunBody } from '../../../src/entrypoints/http/startRunRouteParser.js';
import { parseStartRunPlannerEnvelope } from '../../../src/entrypoints/http/startRunRoutePlannerEnvelopeMapper.js';
import { parseStartRunPlanRef } from '../../../src/entrypoints/http/startRunRoutePlanRefParser.js';
import { parseStartRunRunExecutionContextRef } from '../../../src/entrypoints/http/startRunRouteRunExecutionContextRefParser.js';
import { parseStartRunScope } from '../../../src/entrypoints/http/startRunRouteScopeParser.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/p.json',
  sha256: 'abc123',
  schemaVersion: '1.0.0',
  planId: 'p1',
  planVersion: '1.0',
};

describe('startRunRoute parser helpers', () => {
  it('validates body object shape', () => {
    expect(parseStartRunBodyRecord(undefined)).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_body' },
    });
    expect(parseStartRunBodyRecord([])).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_body' },
    });
    expect(parseStartRunBodyRecord({ a: 1 })).toEqual({ ok: true, value: { a: 1 } });
  });

  it('parses scope with domain IDs', () => {
    const parsed = parseStartRunScope({
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'e1',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.value.tenantId.value).toBe('t1');
    expect(parsed.value.projectId.value).toBe('p1');
    expect(parsed.value.environmentId.value).toBe('e1');
  });

  it.each([
    [
      'missing tenant',
      { projectId: 'p1', environmentId: 'e1' },
      { type: 'bad_request', reason: 'missing_tenant_id', target: 'tenantId' },
    ],
    [
      'invalid tenant',
      { tenantId: '   ', projectId: 'p1', environmentId: 'e1' },
      { type: 'bad_request', reason: 'invalid_tenant_id', target: 'tenantId' },
    ],
    [
      'missing project',
      { tenantId: 't1', environmentId: 'e1' },
      { type: 'bad_request', reason: 'missing_project_id', target: 'projectId' },
    ],
    [
      'invalid project',
      { tenantId: 't1', projectId: '   ', environmentId: 'e1' },
      { type: 'bad_request', reason: 'invalid_project_id', target: 'projectId' },
    ],
    [
      'missing environment',
      { tenantId: 't1', projectId: 'p1' },
      { type: 'bad_request', reason: 'missing_environment_id', target: 'environmentId' },
    ],
    [
      'invalid environment',
      { tenantId: 't1', projectId: 'p1', environmentId: '   ' },
      { type: 'bad_request', reason: 'invalid_environment_id', target: 'environmentId' },
    ],
  ])('returns semantic issue for %s', (_desc, input, issue) => {
    expect(parseStartRunScope(input)).toEqual({
      ok: false,
      issue,
    });
  });

  it('parses planRef and normalizes trimmed strings', () => {
    expect(
      parseStartRunPlanRef({
        uri: ' https://plans.example.com/p.json ',
        sha256: ' abc123 ',
        schemaVersion: ' 1.0.0 ',
        planId: ' p1 ',
        planVersion: ' 1.0 ',
      })
    ).toEqual({
      ok: true,
      value: {
        uri: 'https://plans.example.com/p.json',
        sha256: 'abc123',
        schemaVersion: '1.0.0',
        planId: 'p1',
        planVersion: '1.0',
      },
    });

    expect(parseStartRunPlanRef({})).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });

  it('parses runExecutionContextRef and validates shape', () => {
    expect(
      parseStartRunRunExecutionContextRef({
        uri: ' dvt-runctx://tenant-a/run-1/context.json ',
        sha256: ' abc123 ',
        schemaVersion: ' v1.0 ',
        planId: ' p1 ',
        planVersion: ' 1.0 ',
      })
    ).toEqual({
      ok: true,
      value: {
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'abc123',
        schemaVersion: 'v1.0',
        planId: 'p1',
        planVersion: '1.0',
      },
    });

    expect(parseStartRunRunExecutionContextRef({ uri: 'dvt-runctx://x' })).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_run_execution_context_ref',
        target: 'runExecutionContextRef',
      },
    });
  });

  it('maps planner envelope fields and rejects invalid planner source', () => {
    const parsed = parseStartRunPlannerEnvelope(
      {
        graphSource: {
          kind: 'normalized-graph-v1',
          nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
        },
      },
      ['model_a']
    );

    expect(parsed).toEqual({
      ok: true,
      value: {
        graphSource: {
          kind: 'normalized-graph-v1',
          nodes: [{ nodeId: 'model_a', resourceType: 'model', dependsOn: [] }],
        },
      },
    });

    expect(parseStartRunPlannerEnvelope({ graphSource: { kind: 'bad' } }, ['model_a'])).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('rejects conflicting plan inputs before planner parsing', () => {
    expect(
      parseStartRunBody({
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        selection: ['model_a'],
        runId: 'run-1',
        targetAdapter: 'mock',
        planRef: VALID_PLAN_REF,
        graphSource: {
          kind: 'normalized-graph-v1',
          nodes: [],
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'conflicting_plan_inputs' },
    });
  });

  it('preserves target metadata for invalid plan ref at parser boundary', () => {
    expect(
      parseStartRunBody({
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        selection: ['model_a'],
        runId: 'run-1',
        targetAdapter: 'mock',
        planRef: { uri: 'https://plans.example.com/p.json' },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });
});
