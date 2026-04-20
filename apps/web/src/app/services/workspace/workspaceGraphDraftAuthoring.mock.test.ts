import type { DesignGraphDraft } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { SessionContextPort } from '../../ports/sessionContext';
import { createMockWorkspaceGraphDraftAuthoringPort } from './workspaceGraphDraftAuthoring.mock';

function buildSessionContext(): Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'> {
  return {
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'mock' as const,
    }),
  };
}

function buildDraft(nodeId = 'node-1'): DesignGraphDraft {
  return {
    context: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      executionTarget: 'postgres' as const,
    },
    nodes: [
      {
        id: nodeId,
        type: 'source' as const,
        payload: {
          kind: 'postgres_table' as const,
          schema: 'raw',
          table: 'orders',
          alias: 'orders',
        },
      },
    ],
    edges: [],
  };
}

describe('workspaceGraphDraftAuthoring mock port', () => {
  it('shares typed draft state across recreated ports without delegating to workspaceService', async () => {
    const draftStoreKey = {};
    const firstPort = createMockWorkspaceGraphDraftAuthoringPort({
      draftStoreKey,
      sessionContext: buildSessionContext(),
    });

    const saveResult = await firstPort.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-1',
      draft: buildDraft(),
    });

    expect(saveResult.kind).toBe('saved');
    if (saveResult.kind !== 'saved') {
      throw new Error('expected save result');
    }

    const secondPort = createMockWorkspaceGraphDraftAuthoringPort({
      draftStoreKey,
      sessionContext: buildSessionContext(),
    });

    await expect(secondPort.readGraphDraft()).resolves.toMatchObject({
      kind: 'ok',
      record: {
        revision: saveResult.revision,
        draft: {
          nodes: [expect.objectContaining({ id: 'node-1', type: 'source' })],
        },
      },
    });
  });

  it('deduplicates retries and rejects idempotency key reuse for a different payload', async () => {
    const port = createMockWorkspaceGraphDraftAuthoringPort({
      draftStoreKey: {},
      sessionContext: buildSessionContext(),
    });

    const firstAttempt = await port.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-retry',
      draft: buildDraft(),
    });
    const secondAttempt = await port.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-retry',
      draft: buildDraft(),
    });
    const mismatchAttempt = await port.saveGraphDraft({
      expectedRevision: null,
      idempotencyKey: 'idem-retry',
      draft: buildDraft('node-2'),
    });

    expect(secondAttempt).toEqual(firstAttempt);
    expect(mismatchAttempt).toEqual({ kind: 'idempotency_mismatch' });
  });
});
