/** Preserve pending file buffers and honest status when query and editing states overlap. */
import { describe, expect, it } from 'vitest';
import type { FileContent } from '../../ports/workspace';
import type { CodeWorkspaceFileEditPosture } from './codeWorkspaceFileEditPosture';
import type { CodeWorkingTreeSyncPhase } from './codeWorkingTreeSyncModel';
import { resolveCodeWorkbenchErrorPresentation } from './codeWorkbenchErrorModel';
import { resolveWorkspaceFileEditorPresentation } from './workspaceFileEditorPresentation';

const file: FileContent = {
  path: 'models/orders.sql',
  name: 'orders.sql',
  language: 'sql',
  content: 'select 1',
  contentSha256: 'a'.repeat(64),
  lastModified: '2026-11-11T12:00:00Z',
};
const error = resolveCodeWorkbenchErrorPresentation({
  scope: 'file-preview',
  error: new Error('private diagnostic'),
});
const baseline = {
  path: file.path,
  file,
  error: null,
  isPending: false,
  posture: { kind: 'editable' } as const,
  phase: 'synchronized' as const,
  navigationBlocked: false,
};

describe('Workspace file editor surface admission', () => {
  it('retains the same file and its error when a failed read must not discard a pending buffer', () => {
    const result = resolveWorkspaceFileEditorPresentation({
      ...baseline,
      error,
      navigationBlocked: true,
    });
    expect(result.surface).toEqual({ kind: 'file', file, retainedError: error });
  });

  it.each([
    { navigationBlocked: false, path: file.path },
    { navigationBlocked: true, path: 'models/another.sql' },
  ])('does not grant buffer retention to another path or a clean session: %j', (input) => {
    expect(
      resolveWorkspaceFileEditorPresentation({ ...baseline, ...input, error }).surface
    ).toEqual({ kind: 'error', error });
  });

  it('keeps pending, empty and accepted file states mutually exclusive', () => {
    expect(
      resolveWorkspaceFileEditorPresentation({ ...baseline, isPending: true }).surface
    ).toEqual({ kind: 'loading' });
    expect(
      resolveWorkspaceFileEditorPresentation({ ...baseline, file: undefined }).surface
    ).toEqual({ kind: 'empty' });
    expect(resolveWorkspaceFileEditorPresentation(baseline).surface).toEqual({
      kind: 'file',
      file,
      retainedError: undefined,
    });
  });
});

describe('Workspace file editor status projection', () => {
  // A cold session also reports read_only; it is not yet a synchronized read-only band.
  it.each(['editable', 'workspace_read_only'] as const)(
    'preserves the cold %s status before a file is accepted',
    (kind) => {
      const result = resolveWorkspaceFileEditorPresentation({
        ...baseline,
        posture: { kind },
        phase: 'read_only',
        file: undefined,
      });
      expect(result.statusPhase).toBe('read_only');
      expect(result.inlineMessagePlacement).toBe('separate');
    }
  );

  it.each<
    readonly [CodeWorkspaceFileEditPosture['kind'], CodeWorkingTreeSyncPhase, string | undefined]
  >([
    ['editable', 'synchronized', 'synchronized'],
    ['workspace_read_only', 'synchronized', 'read_only'],
    ['authority_unavailable_read_only', 'synchronized', 'read_only'],
    ['workspace_read_only', 'modified', 'modified'],
    ['workspace_read_only', 'syncing', 'syncing'],
    ['workspace_read_only', 'conflict', 'conflict'],
    ['workspace_read_only', 'reconciliation_failed', 'reconciliation_failed'],
    ['graph_owned_read_only', 'synchronized', undefined],
    ['graph_owned_read_only', 'conflict', undefined],
  ])('presents %s with %s without erasing recovery state', (kind, phase, expected) => {
    expect(
      resolveWorkspaceFileEditorPresentation({ ...baseline, posture: { kind }, phase }).statusPhase
    ).toBe(expected);
  });
});
