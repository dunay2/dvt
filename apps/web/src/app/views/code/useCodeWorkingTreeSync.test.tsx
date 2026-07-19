// @vitest-environment jsdom

/** Owned concern: prove Code working-tree command orchestration. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  FileContent,
  IWorkspaceFileContentCommandPort,
  WorkspaceFileSaveReceipt,
} from '../../ports/workspace';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';
import { useCodeWorkingTreeSync } from './useCodeWorkingTreeSync';
import type { CodeWorkingTreeReconciliationOutcome } from './codeWorkingTreeSyncModel';

type CodeWorkingTreeSyncController = ReturnType<typeof useCodeWorkingTreeSync>;

const FILE: FileContent = {
  path: 'models/orders.sql',
  name: 'orders.sql',
  language: 'sql',
  content: 'select 1',
  contentSha256: 'a'.repeat(64),
  lastModified: '2026-07-12T00:00:00.000Z',
};

function receipt(contentSha256: string): WorkspaceFileSaveReceipt {
  return {
    kind: 'saved',
    disposition: 'updated',
    path: FILE.path,
    contentSha256,
    lastModified: '2026-07-12T00:00:01.000Z',
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function SyncHarness({
  commandPort,
  onController,
  reconcilePersistedFile,
}: Readonly<{
  commandPort: IWorkspaceFileContentCommandPort;
  onController: (controller: CodeWorkingTreeSyncController) => void;
  reconcilePersistedFile?: (
    receipt: WorkspaceFileSaveReceipt
  ) => Promise<CodeWorkingTreeReconciliationOutcome>;
}>): null {
  onController(
    useCodeWorkingTreeSync({
      file: FILE,
      commandPort,
      debounceMs: 50,
      reconcilePersistedFile,
    })
  );
  return null;
}

describe('useCodeWorkingTreeSync', () => {
  let container: HTMLDivElement;
  let root: Root;
  let controller: CodeWorkingTreeSyncController;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  async function render(
    commandPort: IWorkspaceFileContentCommandPort,
    reconcilePersistedFile?: (
      receipt: WorkspaceFileSaveReceipt
    ) => Promise<CodeWorkingTreeReconciliationOutcome>
  ): Promise<void> {
    await act(async () => {
      root.render(
        <SyncHarness
          commandPort={commandPort}
          onController={(nextController) => {
            controller = nextController;
          }}
          reconcilePersistedFile={reconcilePersistedFile}
        />
      );
    });
  }

  it('automatically synchronizes a modified value with the loaded SHA', async () => {
    const saveFileContent = vi.fn(async () => receipt('b'.repeat(64)));
    await render({ saveFileContent });

    act(() => controller.updateValue('select 2'));
    expect(controller.phase).toBe('modified');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(saveFileContent).toHaveBeenCalledWith({
      path: FILE.path,
      content: 'select 2',
      expectedRevision: { kind: 'content_sha256', value: FILE.contentSha256 },
    });
    expect(controller.phase).toBe('synchronized');
  });

  it('waits for the contextual post-save consumer before reporting synchronization', async () => {
    const saved = receipt('b'.repeat(64));
    const reconciliation = deferred<CodeWorkingTreeReconciliationOutcome>();
    const reconcilePersistedFile = vi.fn(() => reconciliation.promise);
    const saveFileContent = vi.fn(async () => saved);
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(reconcilePersistedFile).toHaveBeenCalledWith(saved);
    expect(saveFileContent).toHaveBeenCalledTimes(1);
    expect(controller.phase).toBe('reconciling');

    await act(async () =>
      reconciliation.resolve({
        kind: 'fresh',
        analysisSha256: 'c'.repeat(64),
        projectContentSetSha256: 'd'.repeat(64),
      })
    );
    expect(controller.phase).toBe('synchronized');
    expect(saveFileContent).toHaveBeenCalledTimes(1);
  });

  it('resolves flush after byte persistence while semantic reconciliation remains pending', async () => {
    const saved = receipt('b'.repeat(64));
    const reconciliation = deferred<CodeWorkingTreeReconciliationOutcome>();
    const reconcilePersistedFile = vi.fn(() => reconciliation.promise);
    const saveFileContent = vi.fn(async () => saved);
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select 2'));
    let flushResult: boolean | undefined;
    await act(async () => {
      flushResult = await controller.flush();
    });

    expect(flushResult).toBe(true);
    expect(controller.phase).toBe('reconciling');

    await act(async () => {
      reconciliation.resolve({
        kind: 'fresh',
        analysisSha256: 'c'.repeat(64),
        projectContentSetSha256: 'd'.repeat(64),
      });
      await Promise.resolve();
    });
    expect(controller.phase).toBe('synchronized');
  });

  it('persists an edit made while the previous receipt is still reconciling', async () => {
    const firstReconciliation = deferred<CodeWorkingTreeReconciliationOutcome>();
    const reconcilePersistedFile = vi
      .fn<(receipt: WorkspaceFileSaveReceipt) => Promise<CodeWorkingTreeReconciliationOutcome>>()
      .mockReturnValueOnce(firstReconciliation.promise)
      .mockResolvedValueOnce({
        kind: 'fresh',
        analysisSha256: 'd'.repeat(64),
        projectContentSetSha256: 'e'.repeat(64),
      });
    const saveFileContent = vi
      .fn<IWorkspaceFileContentCommandPort['saveFileContent']>()
      .mockResolvedValueOnce(receipt('b'.repeat(64)))
      .mockResolvedValueOnce(receipt('c'.repeat(64)));
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await controller.flush();
    });
    expect(controller.phase).toBe('reconciling');

    act(() => controller.updateValue('select 3'));
    expect(controller.phase).toBe('modified');

    await act(async () => {
      await controller.flush();
    });

    expect(saveFileContent).toHaveBeenNthCalledWith(2, {
      path: FILE.path,
      content: 'select 3',
      expectedRevision: { kind: 'content_sha256', value: 'b'.repeat(64) },
    });

    await act(async () => {
      firstReconciliation.resolve({
        kind: 'fresh',
        analysisSha256: 'f'.repeat(64),
        projectContentSetSha256: '1'.repeat(64),
      });
      await Promise.resolve();
    });
  });

  it('persists an edit made while the previous DBT save command is still in flight', async () => {
    const firstSave = deferred<WorkspaceFileSaveReceipt>();
    const secondSave = deferred<WorkspaceFileSaveReceipt>();
    const firstReconciliation = deferred<CodeWorkingTreeReconciliationOutcome>();
    const saveFileContent = vi
      .fn<IWorkspaceFileContentCommandPort['saveFileContent']>()
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise);
    const reconcilePersistedFile = vi
      .fn<(receipt: WorkspaceFileSaveReceipt) => Promise<CodeWorkingTreeReconciliationOutcome>>()
      .mockReturnValueOnce(firstReconciliation.promise)
      .mockResolvedValueOnce({
        kind: 'fresh',
        analysisSha256: 'd'.repeat(64),
        projectContentSetSha256: 'e'.repeat(64),
      });
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    act(() => controller.updateValue('select 3'));

    let flushSettled = false;
    let flushResult = false;
    let flushPromise!: Promise<void>;
    act(() => {
      flushPromise = controller.flush().then((result) => {
        flushResult = result;
        flushSettled = true;
      });
    });
    await act(async () => Promise.resolve());
    expect(flushSettled).toBe(false);

    await act(async () => {
      firstSave.resolve(receipt('b'.repeat(64)));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveFileContent).toHaveBeenNthCalledWith(2, {
      path: FILE.path,
      content: 'select 3',
      expectedRevision: { kind: 'content_sha256', value: 'b'.repeat(64) },
    });
    expect(flushSettled).toBe(false);

    await act(async () => {
      secondSave.resolve(receipt('c'.repeat(64)));
      await flushPromise;
    });

    expect(flushResult).toBe(true);
    expect(saveFileContent).toHaveBeenCalledTimes(2);
  });

  it('allows navigation after bytes persist even when post-save reconciliation fails', async () => {
    const saved = receipt('b'.repeat(64));
    const reconcilePersistedFile = vi.fn(
      async (): Promise<CodeWorkingTreeReconciliationOutcome> => {
        throw new Error('DBT analysis failed');
      }
    );
    const saveFileContent = vi.fn(async () => saved);
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select 2'));
    let flushed = true;
    await act(async () => {
      flushed = await controller.flush();
    });

    expect(flushed).toBe(true);
    expect(controller.phase).toBe('reconciliation_failed');
    expect(saveFileContent).toHaveBeenCalledTimes(1);
    expect(reconcilePersistedFile).toHaveBeenCalledTimes(1);
  });

  it('retries failed reconciliation without rewriting persisted content', async () => {
    const saved = receipt('b'.repeat(64));
    const reconcilePersistedFile = vi
      .fn<(receipt: WorkspaceFileSaveReceipt) => Promise<CodeWorkingTreeReconciliationOutcome>>()
      .mockRejectedValueOnce(new Error('DBT analysis failed'))
      .mockResolvedValueOnce({
        kind: 'fresh',
        analysisSha256: 'c'.repeat(64),
        projectContentSetSha256: 'd'.repeat(64),
      });
    const saveFileContent = vi.fn(async () => saved);
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await controller.flush();
    });

    await act(async () => {
      await controller.retry();
    });

    expect(controller.phase).toBe('synchronized');
    expect(saveFileContent).toHaveBeenCalledTimes(1);
    expect(reconcilePersistedFile).toHaveBeenCalledTimes(2);
  });

  it('serializes a later edit after the in-flight write completes', async () => {
    const first = deferred<WorkspaceFileSaveReceipt>();
    const second = deferred<WorkspaceFileSaveReceipt>();
    const saveFileContent = vi
      .fn<IWorkspaceFileContentCommandPort['saveFileContent']>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await render({ saveFileContent });

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    act(() => controller.updateValue('select 3'));

    await act(async () => first.resolve(receipt('b'.repeat(64))));
    expect(controller.phase).toBe('modified');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(saveFileContent).toHaveBeenNthCalledWith(2, {
      path: FILE.path,
      content: 'select 3',
      expectedRevision: { kind: 'content_sha256', value: 'b'.repeat(64) },
    });

    await act(async () => second.resolve(receipt('c'.repeat(64))));
    expect(controller.phase).toBe('synchronized');
  });

  it('exposes conflict and does not retry a stale revision automatically', async () => {
    const saveFileContent = vi.fn(async () => {
      throw new WorkspaceFileRevisionConflictError(FILE.path);
    });
    await render({ saveFileContent });

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(controller.phase).toBe('conflict');
    expect(saveFileContent).toHaveBeenCalledTimes(1);
  });

  it('flushes immediately before a file-selection transition', async () => {
    const saveFileContent = vi.fn(async () => receipt('b'.repeat(64)));
    await render({ saveFileContent });

    act(() => controller.updateValue('select 2'));
    let result = false;
    await act(async () => {
      result = await controller.flush();
    });

    expect(result).toBe(true);
    expect(saveFileContent).toHaveBeenCalledTimes(1);
    expect(controller.phase).toBe('synchronized');
  });

  it('does not report synchronized when persistence yields invalid project analysis', async () => {
    const saved = receipt('b'.repeat(64));
    const reconcilePersistedFile = vi.fn(
      async (): Promise<CodeWorkingTreeReconciliationOutcome> => ({
        kind: 'degraded',
        freshness: 'invalid',
      })
    );
    const saveFileContent = vi.fn(async () => saved);
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select invalid_sql'));
    let flushed = true;
    await act(async () => {
      flushed = await controller.flush();
    });

    expect(flushed).toBe(true);
    expect(controller.phase).toBe('persisted_invalid');
    expect(saveFileContent).toHaveBeenCalledTimes(1);
    expect(reconcilePersistedFile).toHaveBeenCalledWith(saved);
  });

  it('keeps a superseded receipt unresolved and does not retry project analysis blindly', async () => {
    const saved = receipt('b'.repeat(64));
    const reconcilePersistedFile = vi.fn(
      async (): Promise<CodeWorkingTreeReconciliationOutcome> => ({
        kind: 'superseded',
        currentContentSha256: 'c'.repeat(64),
      })
    );
    const saveFileContent = vi.fn(async () => saved);
    await render({ saveFileContent }, reconcilePersistedFile);

    act(() => controller.updateValue('select 2'));
    let flushed = true;
    await act(async () => {
      flushed = await controller.flush();
    });
    await act(async () => controller.retry());

    expect(flushed).toBe(true);
    expect(controller.phase).toBe('persisted_superseded');
    expect(saveFileContent).toHaveBeenCalledOnce();
    expect(reconcilePersistedFile).toHaveBeenCalledOnce();
  });

  it('settles a failed persistence retry only after the retry command completes', async () => {
    const retrySave = deferred<WorkspaceFileSaveReceipt>();
    const saveFileContent = vi
      .fn<IWorkspaceFileContentCommandPort['saveFileContent']>()
      .mockRejectedValueOnce(new Error('write unavailable'))
      .mockReturnValueOnce(retrySave.promise);
    await render({ saveFileContent });

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await controller.flush();
    });
    expect(controller.phase).toBe('failed');

    let retrySettled = false;
    let retryPromise!: Promise<void>;
    act(() => {
      retryPromise = controller.retry().then(() => {
        retrySettled = true;
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(saveFileContent).toHaveBeenCalledTimes(2);
    expect(retrySettled).toBe(false);

    await act(async () => {
      retrySave.resolve(receipt('b'.repeat(64)));
      await retryPromise;
    });
    expect(retrySettled).toBe(true);
    expect(controller.phase).toBe('synchronized');
  });
});
