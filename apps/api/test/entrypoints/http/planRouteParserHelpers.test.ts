import { describe, expect, it } from 'vitest';

import { parsePlanRouteBodyRecord } from '../../../src/entrypoints/http/planRouteBodyParser.js';
import { parsePlanRoutePlannerEnvelope } from '../../../src/entrypoints/http/planRoutePlannerEnvelopeParser.js';
import { parsePlanRoutePlanRef } from '../../../src/entrypoints/http/planRoutePlanRefParser.js';
import { parsePlanRouteRunExecutionContextRef } from '../../../src/entrypoints/http/planRouteRunExecutionContextRefParser.js';
import { parsePlanRouteScope as parseScopedPlanRouteScope } from '../../../src/entrypoints/http/planRouteScopeParser.js';
import { parseStartRunBody } from '../../../src/entrypoints/http/startRunRouteParser.js';

import { VALID_GENERATED_RUN_ID } from './startRunRoute.test.support.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/p.json',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0.0',
  planId: 'p1',
  planVersion: '1.0',
};

const START_RUN_ADAPTER_REGISTRY = {
  isSupported(value: string): value is 'temporal' {
    return value === 'temporal';
  },
  listSupported(): ReadonlyArray<'temporal'> {
    return ['temporal'];
  },
};

describe('plan-route helper parsers', () => {
  it('validates body object shape', () => {
    expect(parsePlanRouteBodyRecord(undefined)).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_body' },
    });
    expect(parsePlanRouteBodyRecord([])).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_body' },
    });
    expect(parsePlanRouteBodyRecord({ a: 1 })).toEqual({ ok: true, value: { a: 1 } });
  });

  it('parses scope with domain IDs', () => {
    const parsed = parseScopedPlanRouteScope({
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
    expect(parseScopedPlanRouteScope(input)).toEqual({
      ok: false,
      issue,
    });
  });

  it('parses canonical planRef fields and rejects surrounding whitespace', () => {
    expect(parsePlanRoutePlanRef(VALID_PLAN_REF)).toEqual({
      ok: true,
      value: VALID_PLAN_REF,
    });

    expect(
      parsePlanRoutePlanRef({
        uri: ' https://plans.example.com/p.json ',
        sha256: ' ' + 'a'.repeat(64) + ' ',
        schemaVersion: ' 1.0.0 ',
        planId: ' p1 ',
        planVersion: ' 1.0 ',
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });

    expect(parsePlanRoutePlanRef({})).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });

  it('parses canonical runExecutionContextRef and rejects surrounding whitespace', () => {
    expect(
      parsePlanRouteRunExecutionContextRef({
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'p1',
        planVersion: '1.0',
      })
    ).toEqual({
      ok: true,
      value: {
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'p1',
        planVersion: '1.0',
      },
    });

    expect(
      parsePlanRouteRunExecutionContextRef({
        uri: ' dvt-runctx://tenant-a/run-1/context.json ',
        sha256: ' ' + 'a'.repeat(64) + ' ',
        schemaVersion: ' v1.0 ',
        planId: ' p1 ',
        planVersion: ' 1.0 ',
      })
    ).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_run_execution_context_ref',
        target: 'runExecutionContextRef',
      },
    });

    expect(parsePlanRouteRunExecutionContextRef({ uri: 'dvt-runctx://x' })).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_run_execution_context_ref',
        target: 'runExecutionContextRef',
      },
    });
  });

  it('parses optional runExecutionContextRef pluginCompatibilityFingerprint', () => {
    expect(
      parsePlanRouteRunExecutionContextRef({
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'p1',
        planVersion: '1.0',
        pluginCompatibilityFingerprint:
          '1111111111111111111111111111111111111111111111111111111111111111',
      })
    ).toEqual({
      ok: true,
      value: {
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'p1',
        planVersion: '1.0',
        pluginCompatibilityFingerprint:
          '1111111111111111111111111111111111111111111111111111111111111111',
      },
    });
  });

  it('rejects whitespace-padded pluginCompatibilityFingerprint instead of dropping it', () => {
    expect(
      parsePlanRouteRunExecutionContextRef({
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'a'.repeat(64),
        schemaVersion: 'v1.0',
        planId: 'p1',
        planVersion: '1.0',
        pluginCompatibilityFingerprint:
          ' 1111111111111111111111111111111111111111111111111111111111111111 ',
      })
    ).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_run_execution_context_ref',
        target: 'runExecutionContextRef',
      },
    });
  });

  it('maps planner envelope fields and rejects invalid planner source', () => {
    const parsed = parsePlanRoutePlannerEnvelope({
      graphSource: {
        kind: 'generic-graph-v1',
        sourceFamily: 'dbt',
        sourceVersion: 'manifest-v10',
        nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
      },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
      },
    });

    expect(parsePlanRoutePlannerEnvelope({ graphSource: { kind: 'bad' } })).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });

    expect(
      parsePlanRoutePlannerEnvelope({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [
            { nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] },
            { nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] },
          ],
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });

    expect(
      parsePlanRoutePlannerEnvelope({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: ['missing'] }],
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });

    expect(
      parsePlanRoutePlannerEnvelope({
        manifestRef: {
          uri: 'manifest.json',
          sha256: 'a'.repeat(64),
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('rejects environment targetProfile now that planner ingress is canonical-only', () => {
    expect(
      parsePlanRoutePlannerEnvelope({
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
        environment: {
          environmentId: 'env-1',
          targetProfile: 'dbt-dev',
        },
      })
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_source' },
    });
  });

  it('rejects conflicting plan inputs before planner parsing', () => {
    expect(
      parseStartRunBody(
        {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: { mode: 'explicit', nodeIds: ['model_a'] },
          targetAdapter: 'temporal',
          planRef: VALID_PLAN_REF,
          graphSource: {
            kind: 'generic-graph-v1',
            sourceFamily: 'dbt',
            sourceVersion: 'manifest-v10',
            nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
          },
        },
        START_RUN_ADAPTER_REGISTRY,
        () => VALID_GENERATED_RUN_ID
      )
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'conflicting_plan_inputs' },
    });
  });

  it('preserves target metadata for invalid plan ref at parser boundary', () => {
    expect(
      parseStartRunBody(
        {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: { mode: 'explicit', nodeIds: ['model_a'] },
          targetAdapter: 'temporal',
          planRef: { uri: 'https://plans.example.com/p.json' },
        },
        START_RUN_ADAPTER_REGISTRY,
        () => VALID_GENERATED_RUN_ID
      )
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_plan_ref', target: 'planRef' },
    });
  });

  it('rejects invalid selection, client runId, and invalid targetAdapter', () => {
    expect(
      parseStartRunBody(
        {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: { mode: 'explicit', nodeIds: [' model_a '] },
          targetAdapter: 'temporal',
          planRef: VALID_PLAN_REF,
        },
        START_RUN_ADAPTER_REGISTRY,
        () => VALID_GENERATED_RUN_ID
      )
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_selection', target: 'selection' },
    });

    expect(
      parseStartRunBody(
        {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: { mode: 'explicit', nodeIds: ['model_a'] },
          runId: 'client-run-1',
          targetAdapter: 'temporal',
          planRef: VALID_PLAN_REF,
        },
        START_RUN_ADAPTER_REGISTRY,
        () => VALID_GENERATED_RUN_ID
      )
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'client_run_id_not_allowed', target: 'runId' },
    });

    expect(
      parseStartRunBody(
        {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          selection: { mode: 'explicit', nodeIds: ['model_a'] },
          targetAdapter: ' mock ',
          planRef: VALID_PLAN_REF,
        },
        START_RUN_ADAPTER_REGISTRY,
        () => VALID_GENERATED_RUN_ID
      )
    ).toEqual({
      ok: false,
      issue: { type: 'bad_request', reason: 'invalid_target_adapter', target: 'targetAdapter' },
    });
  });
});
