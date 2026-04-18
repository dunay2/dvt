import { describe, expect, it, vi } from 'vitest';

import type { IWorkspacePort } from '../../ports/workspace';
import { createCanvasDraftRepository } from './canvasDraftRepository';

describe('canvasDraftRepository', () => {
  it('delegates graph-draft reads, saves, and snapshot reads to the workspace port', async () => {
    const workspacePort: Pick<
      IWorkspacePort,
      'getGraphDraft' | 'saveGraphDraft' | 'getGraphSnapshot'
    > = {
      getGraphDraft: vi.fn(async () => ({
        revision: 'rev-1',
        savedAt: '2026-04-18T00:00:00Z',
        draft: {
          nodeIds: ['node-1'],
          nodePositions: {},
          edges: [],
        },
      })),
      saveGraphDraft: vi.fn(async () => ({
        outcome: 'saved' as const,
        record: {
          revision: 'rev-2',
          savedAt: '2026-04-18T00:00:01Z',
          draft: {
            nodeIds: ['node-1'],
            nodePositions: {},
            edges: [],
          },
        },
      })),
      getGraphSnapshot: vi.fn(async () => ({
        nodes: [],
        edges: [],
      })),
    };
    const repository = createCanvasDraftRepository(workspacePort);
    const saveInput = {
      expectedRevision: 'rev-1',
      idempotencyKey: 'idem-1',
      draft: {
        nodeIds: ['node-1'],
        nodePositions: {},
        edges: [],
      },
    };

    await expect(repository.readGraphDraft()).resolves.toEqual(
      expect.objectContaining({ revision: 'rev-1' })
    );
    await expect(repository.saveGraphDraft(saveInput)).resolves.toEqual(
      expect.objectContaining({ outcome: 'saved' })
    );
    await expect(repository.readGraphSnapshot()).resolves.toEqual({
      nodes: [],
      edges: [],
    });

    expect(workspacePort.getGraphDraft).toHaveBeenCalledTimes(1);
    expect(workspacePort.saveGraphDraft).toHaveBeenCalledWith(saveInput);
    expect(workspacePort.getGraphSnapshot).toHaveBeenCalledTimes(1);
  });
});
