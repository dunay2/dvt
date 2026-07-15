import { describe, expect, it, vi } from 'vitest';

import type {
  CanvasAuthoringAuthorityKey,
  ICanvasAuthoringAuthorityStore,
} from '../../src/application/ports/canvasAuthoringAuthority.js';
import { CanvasAuthoringAuthorityPolicy } from '../../src/application/services/canvasAuthoringAuthorityPolicy.js';

const KEY: CanvasAuthoringAuthorityKey = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  canvasId: 'orders-canvas',
};

function storeWithRead(
  read: ICanvasAuthoringAuthorityStore['read']
): ICanvasAuthoringAuthorityStore {
  return {
    migrate: vi.fn(),
    close: vi.fn(),
    read,
    bind: vi.fn(),
    release: vi.fn(),
  };
}

describe('CanvasAuthoringAuthorityPolicy', () => {
  it('resolves an unbound Canvas to the explicit graph-draft default', async () => {
    const read = vi.fn().mockResolvedValue(null);
    const policy = new CanvasAuthoringAuthorityPolicy(storeWithRead(read));

    await expect(policy.resolve(KEY)).resolves.toEqual({
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'orders-canvas',
      authority: { kind: 'graph-draft' },
    });
    expect(read).toHaveBeenCalledWith(KEY);
  });

  it('returns the persisted file authority without accepting caller authority', async () => {
    const binding = {
      schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
      canvasId: 'orders-canvas',
      authority: { kind: 'dbt-project-files' as const, projectRoot: 'analytics' },
    };
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(
        vi.fn().mockResolvedValue({
          key: KEY,
          binding,
          revision: 'authority-1',
          updatedAt: '2026-07-14T10:00:00.000Z',
        })
      )
    );

    await expect(policy.resolve(KEY)).resolves.toEqual(binding);
  });

  it('fails closed when persistence cannot resolve authority', async () => {
    const policy = new CanvasAuthoringAuthorityPolicy(
      storeWithRead(vi.fn().mockRejectedValue(new Error('authority store unavailable')))
    );

    await expect(policy.resolve(KEY)).rejects.toThrow('authority store unavailable');
  });
});
