import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { SessionContextPort } from '../../ports/sessionContext';
import { createMockWorkspaceGraphDraftAuthoringPort } from './workspaceGraphDraftAuthoring.mock';

function buildSessionContext(): Pick<SessionContextPort, 'getWorkspaceScopeSnapshot'> {
  return {
    getWorkspaceScopeSnapshot: () => ({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'temporal' as const,
    }),
  };
}

function buildDraft(nodeId = 'node-1'): WorkspaceGraphAuthoringDraft {
  return {
    nodeIds: [nodeId],
    nodePositions: {
      [nodeId]: { x: 0, y: 0 },
    },
    nodes: [
      {
        id: nodeId,
        name: 'orders',
        pluginId: 'dvt',
        kind: 'source',
        role: 'input',
        status: 'idle',
        tags: [],
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
          nodes: [expect.objectContaining({ id: 'node-1', kind: 'source' })],
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

    expect(firstAttempt.kind).toBe('saved');
    expect(secondAttempt.kind).toBe('saved');
    if (firstAttempt.kind !== 'saved' || secondAttempt.kind !== 'saved') {
      throw new Error('expected saved results');
    }

    expect(secondAttempt.revision).toBe(firstAttempt.revision);
    expect(secondAttempt.capability).toEqual(firstAttempt.capability);
    expect(secondAttempt.formatMeta).toEqual(firstAttempt.formatMeta);
    expect(secondAttempt.auditRef).toMatchObject({
      correlationId: 'mock-correlation-id',
      decisionId: 'mock-decision-id',
      action: 'draft_write',
      outcome: 'allowed',
    });
    expect(secondAttempt.auditRef.recordedAt).toEqual(expect.any(String));
    expect(mismatchAttempt).toEqual({ kind: 'idempotency_mismatch' });
  });
});
