// @vitest-environment jsdom
/** Preserve retained editor recovery and expose reconciliation failure after bytes persist. */
import { DbtProjectGraphProjectionSchema } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveCodeInlineReferenceCopy } from './codeViewCopy';
import { createCodeContextHarness } from './useCodeWorkspaceFileContext.test-harness';

describe('Code retained editor recovery and reconciliation', () => {
  let h: ReturnType<typeof createCodeContextHarness>;
  beforeEach(() => {
    localStorage.clear();
    h = createCodeContextHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it('hides dirty references and restores a saved revision in the same editor through existing reconciliation', async () => {
    await h.renderFile('editable');
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    const editor = h.container.querySelector('textarea')!;
    const next = `${h.scenario.fixture.file.content}\n-- edited`;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        editor,
        next
      );
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
    await act(async () => {
      await h.handle.current!.flush();
    });
    await h.waitFor(
      () =>
        h.container.textContent?.includes(
          resolveCodeInlineReferenceCopy('en-US').pendingAnalysisMessage
        ) === true
    );
    expect(h.analysis).toHaveBeenCalledTimes(1);
    await h.renderFile('editable');
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.container.querySelector('textarea')).toBe(editor);
    expect(editor.value).toBe(next);
    expect(h.save).toHaveBeenCalledTimes(1);
    expect(h.graph.mock.calls.length).toBeGreaterThan(1);
    expect(
      h.container
        .querySelector('[data-slot="code-working-tree-status"]')
        ?.getAttribute('data-phase')
    ).toBe('synchronized');
  });

  it.each([
    ['YAML', 'models/schema.yml', 'yaml', 'version: 2', '# accepted legacy edit'],
    ['plain SQL', 'models/ventas.sql', 'sql', 'select 1 as value', '-- accepted legacy edit'],
  ] as const)(
    'reconciles an accepted legacy %s edit without automatic reference work',
    async (_kind, path, language, content, comment) => {
      h.scenario.fixture.file = {
        ...h.scenario.fixture.file,
        path: `inline_code_demo/${path}`,
        name: path.split('/').at(-1)!,
        language,
        content,
        contentSha256: sha256HexUtf8(content),
      };
      await h.renderFile('editable');
      await h.waitFor(() => h.container.querySelector('textarea') != null);
      expect(h.graph).toHaveBeenCalledTimes(language === 'sql' ? 1 : 0);
      const editor = h.container.querySelector('textarea')!;
      const next = `${content}\n${comment}`;
      h.save.mockImplementationOnce(async (input) => {
        h.scenario.fixture.file = {
          ...h.scenario.fixture.file,
          content: input.content,
          contentSha256: sha256HexUtf8(input.content),
        };
        h.scenario.fixture.project = DbtProjectGraphProjectionSchema.parse({
          ...h.scenario.fixture.project,
          analysisSha256: sha256HexUtf8(`analysis:${input.content}`),
          projectRevision: {
            ...h.scenario.fixture.project.projectRevision,
            contentSetSha256: sha256HexUtf8(input.content),
          },
        });
        return {
          kind: 'saved' as const,
          disposition: 'updated' as const,
          path: input.path,
          contentSha256: h.scenario.fixture.file.contentSha256,
          lastModified: h.scenario.fixture.file.lastModified,
        };
      });
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
          editor,
          next
        );
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        await h.handle.current!.flush();
      });
      await h.waitFor(() => h.container.querySelector('[data-phase="synchronized"]') != null);
      expect(h.container.querySelector('textarea')).toBe(editor);
      expect(editor.value).toBe(next);
      expect(h.save).toHaveBeenCalledTimes(1);
      expect(h.scenario.fixture.file.contentSha256).toBe(sha256HexUtf8(next));
      expect(h.analysis).not.toHaveBeenCalled();
      expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
    }
  );

  it('keeps cards hidden and exposes reconciliation failure after bytes persist', async () => {
    await h.renderFile('editable');
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    h.graph.mockRejectedValue(new Error('analysis offline'));
    const editor = h.container.querySelector('textarea')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(
        editor,
        `${h.scenario.fixture.file.content}\n-- edit`
      );
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await h.handle.current!.flush();
    });
    await h.waitFor(
      () => h.container.querySelector('[data-phase="reconciliation_failed"]') != null
    );
    expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
    expect(h.save).toHaveBeenCalledTimes(1);
  });
});
