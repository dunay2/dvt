import { describe, expect, it } from 'vitest';

import { parseStartRunBodyRecord } from '../../../src/entrypoints/http/startRunRouteBodyValidation.js';
import { parseStartRunPlannerEnvelope } from '../../../src/entrypoints/http/startRunRoutePlannerEnvelopeMapper.js';
import { parseStartRunPlanRef } from '../../../src/entrypoints/http/startRunRoutePlanRefParser.js';
import { parseStartRunScope } from '../../../src/entrypoints/http/startRunRouteScopeParser.js';

describe('startRunRoute parser helpers', () => {
  it('validates body object shape', () => {
    expect(parseStartRunBodyRecord(undefined)).toEqual({ ok: false, code: 'INVALID_BODY' });
    expect(parseStartRunBodyRecord([])).toEqual({ ok: false, code: 'INVALID_BODY' });
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

    expect(
      parseStartRunScope({
        tenantId: '   ',
        projectId: 'p1',
        environmentId: 'e1',
      })
    ).toEqual({ ok: false, code: 'INVALID_TENANT_ID' });
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

    expect(parseStartRunPlanRef({})).toEqual({ ok: false, code: 'INVALID_PLAN_REF' });
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
      code: 'INVALID_PLAN_SOURCE',
    });
  });
});
