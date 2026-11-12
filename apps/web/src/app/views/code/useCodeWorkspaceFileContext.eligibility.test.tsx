// @vitest-environment jsdom
/** Keep non-candidates textual and discard late SQL evidence after file selection changes. */
import { type DbtProjectGraphProjection } from '@dvt/contracts';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveCodeInlineReferenceCopy } from './codeViewCopy';
import { contextFixture } from './codeWorkspaceFileContext.test-support';
import { createCodeContextHarness } from './useCodeWorkspaceFileContext.test-harness';

describe('Code reference candidate eligibility', () => {
  let h: ReturnType<typeof createCodeContextHarness>;
  beforeEach(() => {
    localStorage.clear();
    h = createCodeContextHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it.each([
    ['schema.yml', 'yaml'],
    ['schema.yaml', 'YAML'],
    ['manifest.json', 'json'],
    ['README.md', 'markdown'],
  ])('reads %s without reference queries or reference status', async (name, language) => {
    h.scenario.fixture.file = {
      ...h.scenario.fixture.file,
      path: `inline_code_demo/${name}`,
      name,
      language,
    };
    await h.renderEntry();
    await h.waitFor(() => h.container.querySelector('[data-testid="code-file-viewer"]') != null);
    expect(h.container.querySelector('pre')?.textContent).toBe(h.scenario.fixture.file.content);
    expect(h.container.querySelector('[data-phase="read_only"]')).not.toBeNull();
    expect(h.container.querySelector('textarea')).toBeNull();
    expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
    expect(h.graph).not.toHaveBeenCalled();
    expect(h.analysis).not.toHaveBeenCalled();
    expect(h.save).not.toHaveBeenCalled();
    const copy = resolveCodeInlineReferenceCopy('en-US');
    expect(h.container.textContent).not.toContain(copy.checkingMessage);
    expect(h.container.textContent).not.toContain(copy.unavailableMessage);
  });

  it.each(['discovered', 'provided'] as const)(
    'reads plain SQL with %s project context without reference queries or status',
    async (context) => {
      h.scenario.fixture = contextFixture('select client_id, country from raw.client');
      if (context === 'provided') await h.renderFile('read-only', h.scenario.fixture.project);
      else await h.renderEntry();
      await h.waitFor(() => h.container.querySelector('[data-testid="code-file-viewer"]') != null);
      expect(h.container.querySelector('pre')?.textContent).toBe(h.scenario.fixture.file.content);
      expect(h.container.querySelector('[data-phase="read_only"]')).not.toBeNull();
      expect(h.container.querySelector('textarea')).toBeNull();
      expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(h.graph).toHaveBeenCalledTimes(context === 'discovered' ? 1 : 0);
      expect(h.analysis).not.toHaveBeenCalled();
      expect(h.save).not.toHaveBeenCalled();
      const copy = resolveCodeInlineReferenceCopy('en-US');
      expect(h.container.textContent).not.toContain(copy.checkingMessage);
      expect(h.container.textContent).not.toContain(copy.unavailableMessage);
    }
  );

  it('keeps SQL eligibility case insensitive for a server-selected model', async () => {
    h.scenario.fixture.file.language = 'SQL';
    await h.renderEntry();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.graph).toHaveBeenCalledTimes(1);
    expect(h.analysis).toHaveBeenCalledTimes(1);
    expect(h.save).not.toHaveBeenCalled();
  });

  it.each([
    ['late', 'YAML'],
    ['cached', 'YAML'],
    ['late', 'plain SQL'],
    ['cached', 'plain SQL'],
  ] as const)('ignores %s SQL evidence after selecting %s', async (mode, target) => {
    const first = { ...h.scenario.fixture };
    let finishGraph!: (projection: DbtProjectGraphProjection) => void;
    const pending = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishGraph = resolve;
    });
    if (mode === 'late') h.graph.mockImplementationOnce(() => pending);
    try {
      await h.renderFile();
      if (mode === 'cached') await h.analyzeReferences();
      await h.waitFor(() => h.graph.mock.calls.length === 1);
      if (mode === 'cached')
        await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
      h.scenario.fixture.file =
        target === 'YAML'
          ? {
              ...first.file,
              path: 'inline_code_demo/models/schema.yml',
              name: 'schema.yml',
              language: 'yaml',
            }
          : {
              ...contextFixture('select client_id, country from raw.client').file,
              path: 'inline_code_demo/models/clientes.sql',
              name: 'clientes.sql',
            };
      const targetFile = h.scenario.fixture.file;
      await h.renderFile();
      await act(async () => finishGraph(first.project));
      await h.waitFor(() => h.container.querySelector('pre')?.textContent === targetFile.content);
      await h.waitFor(() => h.client.isFetching() === 0);
      expect(h.container.querySelector('pre')?.textContent).toBe(targetFile.content);
      expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(h.container.querySelector('[data-phase="read_only"]')).not.toBeNull();
      const copy = resolveCodeInlineReferenceCopy('en-US');
      expect(h.container.textContent).not.toContain(copy.checkingMessage);
      expect(h.container.textContent).not.toContain(copy.unavailableMessage);
      expect(h.graph).toHaveBeenCalledTimes(target === 'plain SQL' ? 2 : 1);
      expect(h.analysis).toHaveBeenCalledTimes(mode === 'late' ? 0 : 1);
      expect(h.save).not.toHaveBeenCalled();
    } finally {
      await act(async () => finishGraph(first.project));
    }
  });
});
