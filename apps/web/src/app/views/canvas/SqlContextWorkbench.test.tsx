// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SqlContextWorkbench } from './SqlContextWorkbench';
import CodeView, { type CodeViewProps } from '../CodeView';

vi.mock('../CodeView', () => ({
  default: vi.fn(({ fileScope, reconcilePersistedFile }: CodeViewProps) => (
    <div
      data-slot="mock-code-view"
      data-project-root={
        fileScope?.kind === 'dbt-project-files' ? fileScope.projectRoot : undefined
      }
      data-initial-path={
        fileScope?.kind === 'dbt-project-files' ? fileScope.initialPath : undefined
      }
      data-has-sync-consumer={String(reconcilePersistedFile != null)}
    />
  )),
}));

describe('SqlContextWorkbench', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('opens the selected node SQL path inside the existing project-scoped Code workbench', async () => {
    const reconcilePersistedFile = vi.fn(async () => ({
      kind: 'fresh' as const,
      analysisSha256: 'a'.repeat(64),
      projectContentSetSha256: 'b'.repeat(64),
    }));
    await act(async () => {
      root.render(
        <SqlContextWorkbench
          fileScope={{
            kind: 'dbt-project-files',
            projectRoot: 'analytics',
            initialPath: 'analytics/models/marts/orders.sql',
          }}
          reconcilePersistedFile={reconcilePersistedFile}
        />
      );
    });

    await waitFor(() => {
      const codeView = container.querySelector('[data-slot="mock-code-view"]');
      expect(codeView?.getAttribute('data-project-root')).toBe('analytics');
      expect(codeView?.getAttribute('data-initial-path')).toBe('analytics/models/marts/orders.sql');
      expect(codeView?.getAttribute('data-has-sync-consumer')).toBe('true');
    });
  });

  it('forwards workspace presentation and repeated file requests into the same Code workbench', async () => {
    const firstRequest = { path: 'notes/b.md' };
    await act(async () =>
      root.render(
        <SqlContextWorkbench
          presentation="project-workspace"
          fileScope={{ kind: 'workspace-files' }}
          initialPath="notes/a.md"
          fileSelectionRequest={firstRequest}
        />
      )
    );
    const workbench = container.querySelector('[data-slot="mock-code-view"]');
    expect(workbench).not.toBeNull();
    expect(vi.mocked(CodeView).mock.calls.at(-1)?.[0].fileSelectionRequest).toBe(firstRequest);
    expect(vi.mocked(CodeView).mock.calls.at(-1)?.[0].presentation).toBe('project-workspace');
    const nextRequest = { path: firstRequest.path };
    await act(async () =>
      root.render(
        <SqlContextWorkbench
          presentation="project-workspace"
          fileScope={{ kind: 'workspace-files' }}
          initialPath="notes/a.md"
          fileSelectionRequest={nextRequest}
        />
      )
    );
    expect(vi.mocked(CodeView).mock.calls.at(-1)?.[0].fileSelectionRequest).toBe(nextRequest);
    expect(vi.mocked(CodeView).mock.calls.at(-1)?.[0].presentation).toBe('project-workspace');
    expect(vi.mocked(CodeView).mock.calls.at(-1)?.[0].initialPath).toBe('notes/a.md');
    expect(container.querySelector('[data-slot="mock-code-view"]')).toBe(workbench);
  });
});
