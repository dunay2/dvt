// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FileContent } from '../ports/workspace';
import { mockGraphDraftAuthoringAuthority } from '../../testing/workspacePortDoubles';
import {
  activateDiffViewButton,
  buildFileContent,
  findDiffViewButton,
  type DiffViewMounted,
  installDiffViewDomDoubles,
  renderDiffView,
  waitForDiffViewText,
} from './test/DiffViewHarness';

describe('DiffView SQL preview', () => {
  let mounted: DiffViewMounted | null;
  let cleanupDomDoubles: (() => void) | null;

  beforeEach(() => {
    mounted = null;
    cleanupDomDoubles = installDiffViewDomDoubles();
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    cleanupDomDoubles?.();
  });

  it('renders Monaco-backed SQL diff when the SQL tab is selected', async () => {
    mounted = await renderDiffView();

    await waitForDiffViewText(
      mounted,
      'fct_sales',
      'diff changes render before SQL tab interaction'
    );

    const sqlTab = findDiffViewButton('SQL Diff');
    expect(sqlTab).toBeTruthy();

    await activateDiffViewButton(sqlTab);

    await waitFor(() => {
      expect(sqlTab?.getAttribute('data-state')).toBe('active');
      expect(mounted?.container.querySelector('[data-testid="monaco-diff-viewer"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Compiled SQL Diff: fct_sales');
    expect(mounted.container.textContent).toContain('{{ ref("stg_orders") }}');
    expect(mounted.container.textContent).toContain("WHERE o.order_date >= '2020-01-01'");
    expect(mounted.container.textContent).toContain('discount_amount');
  });

  it('shows governed SQL loading state while workspace file content is still loading', async () => {
    let resolveFileContent!: (value: FileContent) => void;

    mounted = await renderDiffView({
      files: {
        getFileContent: () =>
          new Promise<FileContent>((resolve) => {
            resolveFileContent = resolve;
          }),
      },
    });

    await waitForDiffViewText(
      mounted,
      'fct_sales',
      'diff changes render before SQL loading assertions'
    );

    const sqlTab = findDiffViewButton('SQL Diff');
    expect(sqlTab).toBeTruthy();

    await activateDiffViewButton(sqlTab);

    await waitFor(() => {
      expect(
        mounted?.container.querySelector('[data-slot="diff-sql-loading-state"]')
      ).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Loading SQL preview');
    expect(mounted.container.querySelector('[data-testid="monaco-diff-viewer"]')).toBeNull();

    resolveFileContent(buildFileContent('models/marts/fct_sales.sql'));
  });

  it('shows governed SQL preview error when the current workspace file fails to load', async () => {
    mounted = await renderDiffView({
      files: {
        getFileContent: async () => {
          throw new Error('Workspace file preview offline');
        },
      },
    });

    await waitForDiffViewText(
      mounted,
      'fct_sales',
      'diff changes render before SQL error assertions'
    );

    const sqlTab = findDiffViewButton('SQL Diff');
    expect(sqlTab).toBeTruthy();

    await activateDiffViewButton(sqlTab);

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-sql-error-state"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Unable to load SQL preview');
    expect(mounted.container.textContent).toContain('Workspace file preview offline');
    expect(mounted.container.querySelector('[data-testid="monaco-diff-viewer"]')).toBeNull();
  });

  it('preserves graph review and shows compare-context fallback when the changed node is missing', async () => {
    mounted = await renderDiffView({
      graph: {
        getGraphSnapshot: async () => ({
          authoringAuthority: mockGraphDraftAuthoringAuthority,
          nodes: [],
          edges: [],
        }),
      },
    });

    await waitForDiffViewText(mounted, 'fct_sales', 'graph diff still renders without context');

    const sqlTab = findDiffViewButton('SQL Diff');
    expect(sqlTab).toBeTruthy();

    await activateDiffViewButton(sqlTab);

    await waitFor(() => {
      expect(
        mounted?.container.querySelector('[data-slot="diff-sql-unavailable-state"]')
      ).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Compare context unavailable');
    expect(mounted.container.querySelector('[data-testid="monaco-diff-viewer"]')).toBeNull();
  });
});
