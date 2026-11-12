// @vitest-environment jsdom
/** Protect the command boundary from leaking file-provider diagnostics into UI messages. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { createCodeModelCommandsHarness } from './CodeModelCommands.test-support';
import { resolveCodeViewCopy } from './codeViewCopy';
import { WorkspaceFileLoadError } from '../../services/workspace/workspaceErrors';
import { executableContextFixture } from './codeWorkspaceFileContext.test-support';

describe('Code command file verification failures', () => {
  const h = createCodeModelCommandsHarness();
  beforeEach(h.reset);
  afterEach(h.cleanup);

  // Preserve the cause after adapting a file query to the shared Preview/Run commands.
  it.each([
    ['compile', 'missing'],
    ['execute', 'missing'],
    ['compile', 'changed'],
    ['execute', 'changed'],
  ] as const)('explains a %s rejection when the file is %s', async (command, reason) => {
    h.ui = await withTestQueryClient(h.render());
    if (command === 'execute') await h.click('compile');
    h.preview.mockClear();
    let rejectRead: ((error: Error) => void) | undefined;
    if (reason === 'missing')
      h.pendingRead = new Promise((_resolve, reject) => {
        rejectRead = reject;
      });
    else h.serverFile = executableContextFixture('select 9 as id').file;
    await h.click(command);
    const rejectMissingRead = rejectRead;
    if (rejectMissingRead)
      await act(async () => {
        rejectMissingRead(new WorkspaceFileLoadError('not_found', h.fixture.file.path));
      });
    const copy = resolveCodeViewCopy(useApplicationLanguageStore.getState().language);
    expect(h.feedback.error).toHaveBeenCalledWith(
      reason === 'missing' ? copy.previewMissingMessagePrefix : copy.workingTreeConflictMessage
    );
    expect(h.preview).not.toHaveBeenCalled();
    expect(h.startRun).not.toHaveBeenCalled();
    expect(h.button('execute').disabled).toBe(true);
  });

  it.each([
    ['compile', 'en'],
    ['execute', 'es'],
  ] as const)(
    'presents a safe localized message when %s cannot verify the file',
    async (command, language) => {
      const previousLanguage = useApplicationLanguageStore.getState().language;
      await act(async () => {
        useApplicationLanguageStore.getState().configureApplicationLanguage(language);
      });
      try {
        h.ui = await withTestQueryClient(h.render());
        if (command === 'execute') await h.click('compile');
        h.preview.mockClear();
        let rejectRead!: (error: Error) => void;
        h.pendingRead = new Promise((_resolve, reject) => {
          rejectRead = reject;
        });
        await h.click(command);
        await act(async () => {
          rejectRead(new Error('Private provider credential diagnostic'));
        });

        expect(h.preview).not.toHaveBeenCalled();
        expect(h.startRun).not.toHaveBeenCalled();
        expect(h.button('execute').disabled).toBe(true);
        expect(h.feedback.error).toHaveBeenCalledWith(
          resolveCodeViewCopy(language).previewErrorMessage
        );
        expect(h.feedback.error.mock.calls.flat().join(' ')).not.toContain('Private provider');
      } finally {
        await act(async () => {
          useApplicationLanguageStore.getState().configureApplicationLanguage(previousLanguage);
        });
      }
    }
  );
});
