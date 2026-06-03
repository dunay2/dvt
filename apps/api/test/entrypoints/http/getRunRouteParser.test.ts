import { describe, expect, it } from 'vitest';

import { parseGetRunRequest } from '../../../src/entrypoints/http/getRunRouteParser.js';

describe('parseGetRunRequest', () => {
  it('returns a tenant-owned requested scope for run-view authorization', () => {
    const result = parseGetRunRequest({
      runId: 'run-1',
      tenantId: 'tenant-a',
      enriched: 'false',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        useCaseInput: {
          runId: 'run-1',
          enriched: false,
        },
        requestedScope: {
          resource: 'tenant',
          tenantId: expect.objectContaining({ value: 'tenant-a' }),
          action: { kind: 'query', name: 'run:view' },
        },
      },
    });
  });
});
