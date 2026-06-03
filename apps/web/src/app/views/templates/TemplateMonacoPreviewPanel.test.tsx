// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TemplateMonacoPreviewPanel } from './TemplateMonacoPreviewPanel';

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: ({
    ariaLabel,
    language,
    loadingLabel,
    path,
    value,
  }: {
    ariaLabel: string;
    language: string;
    loadingLabel?: string;
    path?: string;
    value: string;
  }) => (
    <div
      data-aria-label={ariaLabel}
      data-language={language}
      data-loading-label={loadingLabel}
      data-path={path}
      data-testid="monaco-code-viewer"
    >
      {value}
    </div>
  ),
}));

describe('TemplateMonacoPreviewPanel', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    root = null;
    container = null;
  });

  function renderPanel(): void {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    act(() => {
      root?.render(
        <TemplateMonacoPreviewPanel
          exportFileName="load_orders.task.sql"
          language="sql"
          provider="Snowflake"
          source="create or replace task load_orders;"
        />
      );
    });
  }

  it('renders generated source through a read-only Monaco viewer', () => {
    renderPanel();

    const viewer = container?.querySelector('[data-testid="monaco-code-viewer"]');

    expect(container?.textContent).toContain('Generated preview');
    expect(container?.textContent).toContain('load_orders.task.sql');
    expect(container?.textContent).not.toContain('Save');
    expect(container?.textContent).not.toContain('Apply');
    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute('data-language')).toBe('sql');
    expect(viewer?.getAttribute('data-path')).toBe('load_orders.task.sql');
    expect(viewer?.getAttribute('data-aria-label')).toBe(
      'Generated Snowflake preview: load_orders.task.sql'
    );
    expect(viewer?.getAttribute('data-loading-label')).toBe(
      'Loading load_orders.task.sql preview...'
    );
    expect(viewer?.textContent).toContain('create or replace task load_orders;');
  });
});
