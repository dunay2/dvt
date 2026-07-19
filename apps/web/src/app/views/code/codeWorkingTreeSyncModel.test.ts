/** Owned concern: prove working-tree synchronization state transitions. */
import { describe, expect, it } from 'vitest';

import type { FileContent, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import {
  createCodeWorkingTreeSyncState,
  isCodeWorkingTreeNavigationBlockedPhase,
  reduceCodeWorkingTreeSync,
} from './codeWorkingTreeSyncModel';

const FILE: FileContent = {
  path: 'models/orders.sql',
  name: 'orders.sql',
  language: 'sql',
  content: 'select 1',
  contentSha256: 'a'.repeat(64),
  lastModified: '2026-07-12T00:00:00.000Z',
};

function savedReceipt(contentSha256 = 'b'.repeat(64)): WorkspaceFileSaveReceipt {
  return {
    kind: 'saved',
    disposition: 'updated',
    path: FILE.path,
    contentSha256,
    lastModified: '2026-07-12T00:00:01.000Z',
  };
}

describe('CodeWorkingTreeSync model', () => {
  it('starts synchronized and marks changed editor content as modified', () => {
    const initial = createCodeWorkingTreeSyncState(FILE);

    expect(initial.phase).toBe('synchronized');
    expect(initial.value).toBe(FILE.content);

    const modified = reduceCodeWorkingTreeSync(initial, {
      type: 'edited',
      value: 'select 2',
    });

    expect(modified.phase).toBe('modified');
    expect(modified.value).toBe('select 2');
  });

  it('keeps a later edit modified after the in-flight value is synchronized', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 1,
    });
    const editedAgain = reduceCodeWorkingTreeSync(syncing, {
      type: 'edited',
      value: 'select 3',
    });

    const completed = reduceCodeWorkingTreeSync(editedAgain, {
      type: 'content_persisted',
      requestId: 1,
      receipt: savedReceipt(),
      requiresReconciliation: false,
    });

    expect(completed.phase).toBe('modified');
    expect(completed.value).toBe('select 3');
    expect(completed.persistedContent).toBe('select 2');
    expect(completed.persistedRevision).toBe('b'.repeat(64));
    expect(completed.inFlight).toBeNull();
  });

  it('keeps a later edit modified when the in-flight value requires reconciliation', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 12,
    });
    const editedAgain = reduceCodeWorkingTreeSync(syncing, {
      type: 'edited',
      value: 'select 3',
    });

    const completed = reduceCodeWorkingTreeSync(editedAgain, {
      type: 'content_persisted',
      requestId: 12,
      receipt: savedReceipt(),
      requiresReconciliation: true,
    });

    expect(completed.phase).toBe('modified');
    expect(completed.value).toBe('select 3');
    expect(completed.persistedContent).toBe('select 2');
    expect(completed.pendingReconciliation).toEqual(savedReceipt());
  });

  it('marks an edit made during reconciliation as requiring another persistence command', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 2,
    });
    const reconciling = reduceCodeWorkingTreeSync(syncing, {
      type: 'content_persisted',
      requestId: 2,
      receipt: savedReceipt(),
      requiresReconciliation: true,
    });

    const editedAgain = reduceCodeWorkingTreeSync(reconciling, {
      type: 'edited',
      value: 'select 3',
    });

    expect(editedAgain.phase).toBe('modified');
    expect(editedAgain.persistedContent).toBe('select 2');
    expect(editedAgain.pendingReconciliation).toEqual(savedReceipt());
  });

  it('keeps the editor value and stops automatic writes after a revision conflict', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 4,
    });

    const conflicted = reduceCodeWorkingTreeSync(syncing, {
      type: 'sync_conflicted',
      requestId: 4,
    });
    const editedWhileConflicted = reduceCodeWorkingTreeSync(conflicted, {
      type: 'edited',
      value: 'select 3',
    });

    expect(editedWhileConflicted.phase).toBe('conflict');
    expect(editedWhileConflicted.value).toBe('select 3');
    expect(editedWhileConflicted.persistedRevision).toBe(FILE.contentSha256);
    expect(editedWhileConflicted.inFlight).toBeNull();
  });

  it('returns to modified after a retryable command failure', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 2,
    });
    const failed = reduceCodeWorkingTreeSync(syncing, {
      type: 'sync_failed',
      requestId: 2,
    });

    expect(failed.phase).toBe('failed');
    expect(
      reduceCodeWorkingTreeSync(failed, {
        type: 'retry_requested',
      }).phase
    ).toBe('modified');
  });

  it('loads a new authoritative file revision as synchronized state', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const nextFile = { ...FILE, path: 'models/customers.sql', content: 'select 4' };

    const loaded = reduceCodeWorkingTreeSync(modified, {
      type: 'file_loaded',
      file: nextFile,
    });

    expect(loaded).toEqual(createCodeWorkingTreeSyncState(nextFile));
  });

  it.each([
    ['stale-last-valid', 'persisted_stale'],
    ['invalid', 'persisted_invalid'],
    ['unavailable', 'persisted_unavailable'],
  ] as const)(
    'keeps a persisted file visibly unresolved when analysis is %s',
    (freshness, expectedPhase) => {
      const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
        type: 'edited',
        value: 'select invalid_sql',
      });
      const syncing = reduceCodeWorkingTreeSync(modified, {
        type: 'sync_started',
        requestId: 7,
      });
      const reconciling = reduceCodeWorkingTreeSync(syncing, {
        type: 'content_persisted',
        requestId: 7,
        receipt: savedReceipt(),
        requiresReconciliation: true,
      });

      const unresolved = reduceCodeWorkingTreeSync(reconciling, {
        type: 'reconciliation_completed',
        receipt: savedReceipt(),
        outcome: { kind: 'degraded', freshness },
      });

      expect(unresolved.phase).toBe(expectedPhase);
      expect(unresolved.pendingReconciliation).toEqual(savedReceipt());
    }
  );

  it('restores degraded analysis posture when a corrective edit is reverted before persistence', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select invalid_sql',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 8,
    });
    const reconciling = reduceCodeWorkingTreeSync(syncing, {
      type: 'content_persisted',
      requestId: 8,
      receipt: savedReceipt(),
      requiresReconciliation: true,
    });
    const invalid = reduceCodeWorkingTreeSync(reconciling, {
      type: 'reconciliation_completed',
      receipt: savedReceipt(),
      outcome: { kind: 'degraded', freshness: 'invalid' },
    });

    const correcting = reduceCodeWorkingTreeSync(invalid, {
      type: 'edited',
      value: 'select 2',
    });
    const reverted = reduceCodeWorkingTreeSync(correcting, {
      type: 'edited',
      value: 'select invalid_sql',
    });

    expect(correcting.phase).toBe('modified');
    expect(reverted.phase).toBe('persisted_invalid');
  });

  it('keeps a superseded persisted revision unresolved until authoritative reload', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 9,
    });
    const reconciling = reduceCodeWorkingTreeSync(syncing, {
      type: 'content_persisted',
      requestId: 9,
      receipt: savedReceipt(),
      requiresReconciliation: true,
    });

    const superseded = reduceCodeWorkingTreeSync(reconciling, {
      type: 'reconciliation_completed',
      receipt: savedReceipt(),
      outcome: { kind: 'superseded', currentContentSha256: 'e'.repeat(64) },
    });

    expect(superseded.phase).toBe('persisted_superseded');
    expect(superseded.pendingReconciliation).toEqual(savedReceipt());
  });

  it('ignores a reconciliation result for an older save receipt', () => {
    const olderReceipt = savedReceipt('b'.repeat(64));
    const newerReceipt = savedReceipt('c'.repeat(64));
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 11,
    });
    const reconciling = reduceCodeWorkingTreeSync(syncing, {
      type: 'content_persisted',
      requestId: 11,
      receipt: newerReceipt,
      requiresReconciliation: true,
    });

    const unchanged = reduceCodeWorkingTreeSync(reconciling, {
      type: 'reconciliation_completed',
      receipt: olderReceipt,
      outcome: {
        kind: 'fresh',
        analysisSha256: 'd'.repeat(64),
        projectContentSetSha256: 'e'.repeat(64),
      },
    });

    expect(unchanged).toBe(reconciling);
  });

  it('distinguishes a failed final authority read from failed project analysis', () => {
    const modified = reduceCodeWorkingTreeSync(createCodeWorkingTreeSyncState(FILE), {
      type: 'edited',
      value: 'select 2',
    });
    const syncing = reduceCodeWorkingTreeSync(modified, {
      type: 'sync_started',
      requestId: 10,
    });
    const reconciling = reduceCodeWorkingTreeSync(syncing, {
      type: 'content_persisted',
      requestId: 10,
      receipt: savedReceipt(),
      requiresReconciliation: true,
    });

    const unavailable = reduceCodeWorkingTreeSync(reconciling, {
      type: 'reconciliation_completed',
      receipt: savedReceipt(),
      outcome: { kind: 'verification-unavailable' },
    });

    expect(unavailable.phase).toBe('persisted_verification_unavailable');
  });

  it.each(['modified', 'syncing', 'conflict', 'failed'] as const)(
    'blocks navigation while persistence is %s',
    (phase) => {
      expect(isCodeWorkingTreeNavigationBlockedPhase(phase)).toBe(true);
    }
  );

  it.each([
    'synchronized',
    'reconciling',
    'reconciliation_failed',
    'persisted_stale',
    'persisted_invalid',
    'persisted_unavailable',
    'persisted_verification_unavailable',
    'persisted_superseded',
  ] as const)('does not block navigation after bytes are persisted in %s', (phase) => {
    expect(isCodeWorkingTreeNavigationBlockedPhase(phase)).toBe(false);
  });
});
