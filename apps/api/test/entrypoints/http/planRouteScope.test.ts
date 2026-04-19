import { describe, expect, it } from 'vitest';

import { parsePlanRouteContextRecord } from '../../../src/entrypoints/http/planRouteScope.js';

import { VALID_PREVIEW_CONTEXT } from './planRouteFixtures.js';

describe('planRouteScope', () => {
  it('returns invalid_body when context is missing', () => {
    expect(parsePlanRouteContextRecord({})).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_body',
      },
    });
  });

  it('returns invalid_body when context does not satisfy the run context contract', () => {
    expect(
      parsePlanRouteContextRecord({
        context: {
          tenantId: 'tenant-1',
          projectId: 'project-1',
        },
      })
    ).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_body',
      },
    });
  });

  it('maps a valid route context into scoped identifiers and target adapter', () => {
    const result = parsePlanRouteContextRecord({
      context: VALID_PREVIEW_CONTEXT,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.tenantId.value).toBe(VALID_PREVIEW_CONTEXT.tenantId);
    expect(result.value.projectId.value).toBe(VALID_PREVIEW_CONTEXT.projectId);
    expect(result.value.environmentId.value).toBe(VALID_PREVIEW_CONTEXT.environmentId);
    expect(result.value.targetAdapter).toBe(VALID_PREVIEW_CONTEXT.targetAdapter);
  });
});
