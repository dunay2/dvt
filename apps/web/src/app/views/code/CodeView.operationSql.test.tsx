/** Prove scoped operation SQL can be edited through the normal Canvas Code workbench. */
import { fireEvent } from '@testing-library/dom';
import { sha256HexUtf8 } from '@dvt/crypto';
import { act, createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IWorkspaceFileContentCommandPort } from '../../ports/workspace';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import type { CodeViewHandle } from '../CodeView';
import { createCodeViewTestHarness } from './tests/CodeView.test-support';

describe('operation SQL in project Code', () => {
  const harness = createCodeViewTestHarness();
  afterEach(harness.cleanup);

  it('saves a published operation with the original file revision', async () => {
    const path = 'operations/tarea.task.sql';
    const original = 'CREATE TASK tarea AS SELECT 1;';
    const content = 'CREATE TASK tarea AS SELECT 2;';
    const save = vi.fn<IWorkspaceFileContentCommandPort['saveFileContent']>(async () => ({
      kind: 'saved',
      disposition: 'updated',
      path,
      contentSha256: sha256HexUtf8(content),
      lastModified: '2026-11-19T20:00:00Z',
    }));
    const view = createRef<CodeViewHandle>();
    harness.setupContainer();
    await harness.renderCodeView({ saveFileContent: save }, false, view, {
      initialPath: path,
      fileScope: { kind: 'workspace-files' },
      presentation: 'project-workspace',
      workspaceGraphSnapshotQuery: {
        getGraphSnapshot: async () => ({
          authoringAuthority: mockGraphDraftAuthoringAuthority,
          nodes: [],
          edges: [],
        }),
      },
      workspaceFilesQuery: harness.buildWorkspaceFilesQueryPort({
        listFiles: async () => [{ path, kind: 'file', name: 'tarea.task.sql' }],
        getFileContent: async (filePath) => ({
          path: filePath,
          name: 'tarea.task.sql',
          content: original,
          language: 'sql',
          contentSha256: sha256HexUtf8(original),
          lastModified: '2026-11-19T19:00:00Z',
        }),
      }),
    });

    const editor = (): Element | null =>
      harness.getContainer().querySelector('[data-testid="monaco-code-editor"]');
    await harness.waitFor(() => editor() != null);
    await act(async () => {
      fireEvent.change(editor()!, { target: { value: content } });
    });
    await act(async () => expect(await view.current?.flush()).toBe(true));
    expect(save).toHaveBeenCalledExactlyOnceWith({
      path,
      content,
      expectedRevision: { kind: 'content_sha256', value: sha256HexUtf8(original) },
    });
  });
});
