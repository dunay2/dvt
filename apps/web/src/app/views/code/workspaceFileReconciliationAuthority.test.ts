/** Owned concern: prove save-receipt correlation against workspace-file authority. */
import { describe, expect, it } from 'vitest';

import type { FileContent, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { reconcileWorkspaceFileAuthority } from './workspaceFileReconciliationAuthority';

const RECEIPT: WorkspaceFileSaveReceipt = {
  kind: 'saved',
  disposition: 'updated',
  path: 'models/orders.sql',
  contentSha256: 'b'.repeat(64),
  lastModified: '2026-07-19T00:00:00.000Z',
};

const FILE: FileContent = {
  path: RECEIPT.path,
  name: 'orders.sql',
  language: 'sql',
  content: 'select 2',
  contentSha256: RECEIPT.contentSha256,
  lastModified: RECEIPT.lastModified,
};

const FRESH_OUTCOME = {
  kind: 'fresh' as const,
  analysisSha256: 'c'.repeat(64),
  projectContentSetSha256: 'd'.repeat(64),
};

describe('reconcileWorkspaceFileAuthority', () => {
  it('preserves the project outcome when the final file read matches the save receipt', () => {
    expect(reconcileWorkspaceFileAuthority(RECEIPT, FILE, FRESH_OUTCOME)).toEqual(FRESH_OUTCOME);
  });

  it('reports a superseded save when path or content authority has changed', () => {
    expect(
      reconcileWorkspaceFileAuthority(
        RECEIPT,
        { ...FILE, content: 'select 3', contentSha256: 'e'.repeat(64) },
        FRESH_OUTCOME
      )
    ).toEqual({ kind: 'superseded', currentContentSha256: 'e'.repeat(64) });
  });
});
