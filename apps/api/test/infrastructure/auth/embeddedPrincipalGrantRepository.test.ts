import { describe, expect, it, vi } from 'vitest';

import { EmbeddedPrincipalGrantRepository } from '../../../src/infrastructure/auth/embeddedPrincipalGrantRepository.js';

describe('EmbeddedPrincipalGrantRepository', () => {
  it('normalizes grant order and optional arrays at the persistence boundary', async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({
      rows: [
        {
          principal_id: 'user-1',
          principal_type: 'user',
          suspended: false,
          tenant_access: [
            {
              tenantId: 'tenant-b',
              projectAccess: [],
            },
            {
              tenantId: 'tenant-a',
              allowedActions: ['z:read', 'a:read', 'z:read'],
              projectAccess: [
                {
                  projectId: 'project-a',
                  environmentAccess: [{ environmentId: 'prod' }, { environmentId: 'dev' }],
                },
              ],
            },
          ],
        },
      ],
    }));
    const repository = new EmbeddedPrincipalGrantRepository({ query } as never);

    await expect(
      repository.load({ principalId: 'user-1', principalType: 'user' })
    ).resolves.toEqual({
      principal: { principalId: 'user-1', principalType: 'user' },
      suspended: false,
      tenantAccess: [
        {
          tenantId: 'tenant-a',
          allowedActions: ['a:read', 'z:read'],
          projectAccess: [
            {
              projectId: 'project-a',
              allowedActions: [],
              environmentAccess: [
                { environmentId: 'dev', allowedActions: [] },
                { environmentId: 'prod', allowedActions: [] },
              ],
            },
          ],
        },
        { tenantId: 'tenant-b', allowedActions: [], projectAccess: [] },
      ],
    });
  });

  it('adds a row lock only when the caller requests one', async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [] }));
    const repository = new EmbeddedPrincipalGrantRepository({ query } as never, 'authz');

    await repository.load({ principalId: 'user-1', principalType: 'user' }, { forUpdate: true });

    expect(String(query.mock.calls[0]?.[0])).toMatch(/LIMIT 1 FOR UPDATE$/);
  });

  it('serializes the normalized snapshot through one update mapper', async () => {
    const query = vi.fn(async (_sql: string, _params?: readonly unknown[]) => ({ rows: [] }));
    const repository = new EmbeddedPrincipalGrantRepository({ query } as never);

    await repository.save({
      principal: { principalId: 'user-1', principalType: 'user' },
      suspended: false,
      tenantAccess: [
        {
          tenantId: 'tenant-a',
          allowedActions: [],
          projectAccess: [],
        },
      ],
    });

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[1]).toEqual([
      'user-1',
      'user',
      false,
      '[{"tenantId":"tenant-a","allowedActions":[],"projectAccess":[]}]',
    ]);
  });
});
