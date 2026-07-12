/** Owned concern: prove working-tree synchronization state transitions. */
import { describe, expect, it } from 'vitest';

import type { FileContent, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import {
  createCodeWorkingTreeSyncState,
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
      type: 'sync_succeeded',
      requestId: 1,
      receipt: savedReceipt(),
    });

    expect(completed.phase).toBe('modified');
    expect(completed.value).toBe('select 3');
    expect(completed.persistedContent).toBe('select 2');
    expect(completed.persistedRevision).toBe('b'.repeat(64));
    expect(completed.inFlight).toBeNull();
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
});
