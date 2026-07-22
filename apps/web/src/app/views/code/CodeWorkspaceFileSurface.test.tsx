import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeWorkspaceFileSurface } from './CodeWorkspaceFileSurface';

vi.mock('../../components/monaco/MonacoCodeEditor', () => ({
  MonacoCodeEditor: () => <div data-testid="workspace-file-editor" />,
}));

vi.mock('../../components/monaco/MonacoCodeViewer', () => ({
  MonacoCodeViewer: () => <div data-testid="workspace-file-viewer" />,
}));

describe('CodeWorkspaceFileSurface', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  function render(posture: 'editable' | 'graph_owned_read_only'): void {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <CodeWorkspaceFileSurface
          ariaLabel="Model SQL"
          file={{
            path: 'models/orders.sql',
            name: 'orders.sql',
            language: 'sql',
            content: 'select 1',
            contentSha256: 'a'.repeat(64),
            lastModified: '2026-07-22T00:00:00.000Z',
          }}
          loadingLabel="Loading"
          onChange={vi.fn()}
          posture={{ kind: posture }}
          value="select 1"
        />
      );
    });
  }

  it('renders exactly one editor for editable authority', () => {
    render('editable');

    expect(container?.querySelector('[data-testid="workspace-file-editor"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="workspace-file-viewer"]')).toBeNull();
  });

  it('renders exactly one viewer for graph-owned authority', () => {
    render('graph_owned_read_only');

    expect(container?.querySelector('[data-testid="workspace-file-editor"]')).toBeNull();
    expect(container?.querySelector('[data-testid="workspace-file-viewer"]')).not.toBeNull();
  });
});
