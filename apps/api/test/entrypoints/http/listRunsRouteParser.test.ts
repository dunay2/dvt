import { describe, expect, it } from 'vitest';

import { parseListRunsRequest } from '../../../src/entrypoints/http/listRunsRouteParser.js';

describe('parseListRunsRequest', () => {
  it('returns a tenant-owned scope when only tenantId is supplied', () => {
    const result = parseListRunsRequest({
      tenantId: 'tenant-a',
      projectId: undefined,
      environmentId: undefined,
      limit: '25',
      cursor: undefined,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        requestedScope: {
          resource: 'tenant',
          tenantId: expect.objectContaining({ value: 'tenant-a' }),
          action: { kind: 'query', name: 'run:list' },
        },
        query: { limit: 25 },
      },
    });
  });

  it('returns a project-owned scope when projectId is supplied without environmentId', () => {
    const result = parseListRunsRequest({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: undefined,
      limit: '25',
      cursor: undefined,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        requestedScope: {
          resource: 'project',
          tenantId: expect.objectContaining({ value: 'tenant-a' }),
          projectId: expect.objectContaining({ value: 'project-a' }),
          action: { kind: 'query', name: 'run:list' },
        },
        query: { limit: 25 },
      },
    });
  });

  it('returns an environment-owned scope when environmentId is supplied', () => {
    const result = parseListRunsRequest({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      limit: '25',
      cursor: undefined,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        requestedScope: {
          resource: 'environment',
          tenantId: expect.objectContaining({ value: 'tenant-a' }),
          projectId: expect.objectContaining({ value: 'project-a' }),
          environmentId: expect.objectContaining({ value: 'env-a' }),
          action: { kind: 'query', name: 'run:list' },
        },
        query: { limit: 25 },
      },
    });
  });

  it('rejects environmentId when projectId is missing', () => {
    const result = parseListRunsRequest({
      tenantId: 'tenant-a',
      projectId: undefined,
      environmentId: 'env-a',
      limit: '25',
      cursor: undefined,
    });

    expect(result).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'missing_project_id',
        target: 'projectId',
      },
    });
  });
});
