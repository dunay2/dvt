// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactMonacoPreviewPanel } from './ArtifactMonacoPreviewPanel';

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

describe('ArtifactMonacoPreviewPanel', () => {
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
        <ArtifactMonacoPreviewPanel
          title="Preview: manifest.json"
          fileName="manifest.json"
          document={{
            path: 'target/manifest.json',
            content: { metadata: { dbt_schema_version: 'workspace' } },
          }}
        />
      );
    });
  }

  it('renders a structured read-only Monaco viewer for the artifact payload', () => {
    renderPanel();

    const viewer = container?.querySelector('[data-testid="monaco-code-viewer"]');

    expect(container?.textContent).toContain('Preview: manifest.json');
    expect(container?.textContent).not.toContain('View Full File');
    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute('data-language')).toBe('json');
    expect(viewer?.getAttribute('data-path')).toBe('target/manifest.json');
    expect(viewer?.getAttribute('data-aria-label')).toBe('Preview: manifest.json');
    expect(viewer?.getAttribute('data-loading-label')).toBe('Loading manifest.json...');
    expect(viewer?.textContent).toContain('"dbt_schema_version": "workspace"');
  });
});
