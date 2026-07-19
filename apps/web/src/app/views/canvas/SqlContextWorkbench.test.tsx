// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SqlContextWorkbench } from './SqlContextWorkbench';

vi.mock('../CodeView', () => ({
  default: ({
    fileScope,
    reconcilePersistedFile,
  }: {
    fileScope?: { projectRoot: string; initialPath?: string };
    reconcilePersistedFile?: () => Promise<unknown>;
  }) => (
    <div
      data-slot="mock-code-view"
      data-project-root={fileScope?.projectRoot}
      data-initial-path={fileScope?.initialPath}
      data-has-sync-consumer={String(reconcilePersistedFile != null)}
    />
  ),
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
          loadingMessage="Loading code"
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
});
