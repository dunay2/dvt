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
  onFileSynchronized,
}: Readonly<{
  commandPort: IWorkspaceFileContentCommandPort;
  onController: (controller: CodeWorkingTreeSyncController) => void;
  onFileSynchronized?: (receipt: WorkspaceFileSaveReceipt) => Promise<void>;
}>): null {
  onController(
    useCodeWorkingTreeSync({
      file: FILE,
      commandPort,
      debounceMs: 50,
      onFileSynchronized,
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
    onFileSynchronized?: (receipt: WorkspaceFileSaveReceipt) => Promise<void>
  ): Promise<void> {
    await act(async () => {
      root.render(
        <SyncHarness
          commandPort={commandPort}
          onController={(nextController) => {
            controller = nextController;
          }}
          onFileSynchronized={onFileSynchronized}
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
    const reconciliation = deferred<void>();
    const onFileSynchronized = vi.fn(() => reconciliation.promise);
    const saveFileContent = vi.fn(async () => saved);
    await render({ saveFileContent }, onFileSynchronized);

    act(() => controller.updateValue('select 2'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(onFileSynchronized).toHaveBeenCalledWith(saved);
    expect(saveFileContent).toHaveBeenCalledTimes(1);
    expect(controller.phase).toBe('syncing');

    await act(async () => reconciliation.resolve());
    expect(controller.phase).toBe('synchronized');
    expect(saveFileContent).toHaveBeenCalledTimes(1);
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
});
