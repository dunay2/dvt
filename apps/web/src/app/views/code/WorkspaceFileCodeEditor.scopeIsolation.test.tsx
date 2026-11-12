/** @vitest-environment jsdom */
/** Owned concern: keep buffers and pending reloads inside their accepted workspace session. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { within } from '@testing-library/dom';
import { createMockSessionContextPort } from '../../../testing/runsPortDoubles';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { FileContent } from '../../ports/workspace';
import { WorkspaceFileRevisionConflictError } from '../../services/workspace/workspaceErrors';
import { contextFixture } from './codeWorkspaceFileContext.test-support';
import { createCodeContextHarness } from './useCodeWorkspaceFileContext.test-harness';

describe('Code editor workspace session isolation', () => {
  let h: ReturnType<typeof createCodeContextHarness>;
  let switchProject: (projectId: string) => void;

  beforeEach(() => {
    localStorage.clear();
    const base = createMockSessionContextPort();
    let scope = base.getWorkspaceScope();
    const subscribers = new Set<() => void>();
    const session: SessionContextPort = {
      ...base,
      getWorkspaceScope: () => scope,
      getWorkspaceScopeSnapshot: () => scope,
      subscribeWorkspaceScope: (listener) => {
        subscribers.add(listener);
        return () => {
          subscribers.delete(listener);
        };
      },
    };
    switchProject = (projectId) => {
      scope = { ...scope, projectId };
      subscribers.forEach((listener) => listener());
    };
    h = createCodeContextHarness(session);
  });
  afterEach(async () => h.cleanup());

  async function edit(value: string): Promise<void> {
    const editor = within(h.container).getByRole<HTMLTextAreaElement>('textbox', { name: 'Code' });
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        editor,
        value
      );
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('accepts a cached same-path file from the next project and rejects the previous reload', async () => {
    const fileA = contextFixture('select 1 as project_a');
    const fileB = contextFixture('select 2 as project_b');
    h.scenario.fixture = fileB;
    await act(async () => switchProject('project-b'));
    await h.renderFile('editable');
    await h.waitFor(() => h.container.querySelector('textarea')?.value === fileB.file.content, {
      timeoutMs: 800,
      description: 'Initial B file',
    });
    // Keep the accepted B query fresh so scope switching does not depend on a loading gap.
    const cachedB = h.client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          (query.state.data as FileContent | undefined)?.contentSha256 === fileB.file.contentSha256
      );
    expect(cachedB).toBeDefined();
    h.client.setQueryDefaults(cachedB!.queryKey, { staleTime: Infinity });

    h.scenario.fixture = fileA;
    await act(async () => switchProject('project-a'));
    await h.renderFile('editable');
    await h.waitFor(() => h.container.querySelector('textarea')?.value === fileA.file.content, {
      timeoutMs: 800,
      description: 'A file after project switch',
    });
    h.save.mockRejectedValueOnce(new WorkspaceFileRevisionConflictError(fileA.file.path));
    await edit('select 10 as unsaved_a');
    await act(async () => expect(await h.handle.current!.flush()).toBe(false));

    let resolveOld!: (file: FileContent) => void;
    h.scenario.fileRead = new Promise((resolve) => {
      resolveOld = resolve;
    });
    await act(async () =>
      within(h.container)
        .getByRole('button', { name: /reload/i })
        .click()
    );
    try {
      h.scenario.fixture = fileB;
      h.scenario.fileRead = undefined;
      await act(async () => switchProject('project-b'));
      await h.renderFile('editable');
      await h.waitFor(() => h.container.querySelector('textarea')?.value === fileB.file.content, {
        timeoutMs: 800,
        description: 'Cached B replaces conflicted A buffer',
      });
      await edit('select 20 as unsaved_b');
      await act(async () => resolveOld(fileA.file));
      expect(h.container.querySelector('textarea')?.value).toBe('select 20 as unsaved_b');
      expect(h.analysis).not.toHaveBeenCalled();
      expect(h.save).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => resolveOld(fileA.file));
    }
  });
});
