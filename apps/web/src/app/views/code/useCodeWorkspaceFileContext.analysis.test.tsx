// @vitest-environment jsdom
/** Require explicit reference analysis; navigation and changed revisions cannot invent evidence. */
import {
  DbtProjectGraphProjectionSchema,
  DbtSelectedModelAnalysisSchema,
  type DbtProjectGraphProjection,
  type DbtSelectedModelAnalysis,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { act } from 'react';
import { within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryKeys } from '../../queries/queryKeys';
import { resolveCodeInlineReferenceCopy } from './codeViewCopy';
import { createCodeContextHarness } from './useCodeWorkspaceFileContext.test-harness';

describe('Code explicit reference analysis and evidence reuse', () => {
  let h: ReturnType<typeof createCodeContextHarness>;
  beforeEach(() => {
    localStorage.clear();
    h = createCodeContextHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it('reuses analyzed references when returning to a file without analyzing on navigation', async () => {
    const original = h.scenario.fixture.file;
    await h.renderFile();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    h.scenario.fixture.file = {
      ...original,
      path: 'inline_code_demo/models/other.sql',
      name: 'other.sql',
      content: 'select 1',
      contentSha256: sha256HexUtf8('select 1'),
    };
    await h.renderFile();
    await h.waitFor(() => h.container.querySelector('pre')?.textContent === 'select 1');
    expect(h.analysis).toHaveBeenCalledTimes(1);
    h.scenario.fixture.file = original;
    await h.renderFile();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.container.textContent).toContain(
      resolveCodeInlineReferenceCopy('en-US').analyzedMessage
    );
    expect(h.analysis).toHaveBeenCalledTimes(1);
    expect(h.save).not.toHaveBeenCalled();
  });

  it('shows reference analysis progress, prevents duplicate clicks and retries only on request', async () => {
    let rejectAnalysis!: (error: Error) => void;
    h.analysis.mockImplementationOnce(
      () =>
        new Promise<DbtSelectedModelAnalysis>((_resolve, reject) => {
          rejectAnalysis = reject;
        })
    );
    const copy = resolveCodeInlineReferenceCopy('en-US');
    await h.renderFile();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.textContent?.includes(copy.analyzingMessage) === true);
    const button = within(h.container).getByRole<HTMLButtonElement>('button', {
      name: copy.analyzeLabel,
    });
    expect(button.disabled).toBe(true);
    await act(async () => button.click());
    expect(h.analysis).toHaveBeenCalledTimes(1);
    await act(async () => rejectAnalysis(new Error('Native reference analysis failed')));
    await h.waitFor(() => h.container.textContent?.includes(copy.unavailableMessage) === true);
    expect(button.disabled).toBe(false);
    expect(h.analysis).toHaveBeenCalledTimes(1);
    await act(async () => button.click());
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.analysis).toHaveBeenCalledTimes(2);
  });

  it('requires explicit reference analysis after a dependency revision changes without changing this file', async () => {
    await h.renderFile();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    h.scenario.fixture.project = DbtProjectGraphProjectionSchema.parse({
      ...h.scenario.fixture.project,
      analysisSha256: 'c'.repeat(64),
      projectRevision: {
        ...h.scenario.fixture.project.projectRevision,
        contentSetSha256: 'd'.repeat(64),
      },
    });
    h.scenario.fixture.analysis = DbtSelectedModelAnalysisSchema.parse({
      ...h.scenario.fixture.analysis,
      analysisSha256: h.scenario.fixture.project.analysisSha256,
      projectRevision: h.scenario.fixture.project.projectRevision,
    });
    await act(async () =>
      h.client.refetchQueries({ queryKey: queryKeys.workspace.dbtProjectGraphRoot() })
    );
    await h.waitFor(
      () =>
        h.container.textContent?.includes(
          resolveCodeInlineReferenceCopy('en-US').pendingAnalysisMessage
        ) === true
    );
    expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
    expect(h.analysis).toHaveBeenCalledTimes(1);
    await h.renderFile();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.analysis).toHaveBeenCalledTimes(2);
  });

  it('keeps checking, ready, and unavailable in the same read-only status band', async () => {
    const copy = resolveCodeInlineReferenceCopy('en-US');
    let finishGraph!: (projection: DbtProjectGraphProjection) => void;
    const pending = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishGraph = resolve;
    });
    h.graph.mockImplementationOnce(() => pending);
    try {
      await h.renderEntry();
      await h.waitFor(
        () => h.container.textContent?.includes(copy.contextCheckingMessage) === true
      );
      const band = h.container.querySelector('[data-slot="code-working-tree-status"]');
      const viewer = h.container.querySelector('[data-testid="code-file-viewer"]');
      expect(band?.textContent).toContain(copy.contextCheckingMessage);
      expect(band?.getAttribute('data-phase')).toBe('read_only');
      await act(async () => finishGraph(h.scenario.fixture.project));
      await h.renderEntry();
      await h.analyzeReferences();
      await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
      expect(h.container.querySelector('[data-slot="code-working-tree-status"]')).toBe(band);
      expect(band?.textContent).toContain(copy.analyzedMessage);
      h.graph.mockRejectedValueOnce(new Error('Project analysis is unavailable.'));
      await act(async () =>
        h.client.refetchQueries({ queryKey: queryKeys.workspace.dbtProjectGraphRoot() })
      );
      await h.waitFor(() => band?.textContent?.includes(copy.unavailableMessage) === true);
      expect(h.container.querySelector('[data-slot="code-working-tree-status"]')).toBe(band);
      expect(h.container.querySelector('[data-testid="code-file-viewer"]')).toBe(viewer);
      expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(h.save).not.toHaveBeenCalled();
    } finally {
      await act(async () => finishGraph(h.scenario.fixture.project));
    }
  });
});
