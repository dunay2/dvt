// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type DiffViewMounted,
  installDiffViewDomDoubles,
  renderDiffView,
  waitForDiffViewText,
} from './test/DiffViewHarness';

describe('DiffView route states', () => {
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

  it('renders diff summary and graph items', async () => {
    mounted = await renderDiffView();

    await waitForDiffViewText(mounted, 'fct_sales', 'diff changes render');

    expect(mounted.container.textContent).toContain('Diff Viewer');
    expect(mounted.container.textContent).toContain('Graph Diff');
    expect(mounted.container.textContent).toContain('Breaking');
    expect(mounted.container.textContent).toContain('fct_sales');
  });

  it('renders the governed empty state when no diff changes are available', async () => {
    mounted = await renderDiffView({
      diff: { getDiffChanges: async () => [] },
    });

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-empty-state"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Diff Viewer');
    expect(mounted.container.textContent).toContain('No diff changes available');
    expect(mounted.container.textContent).not.toContain('Graph Diff');
  });

  it('renders the governed error state when diff changes fail to load', async () => {
    mounted = await renderDiffView({
      diff: {
        getDiffChanges: async () => {
          throw new Error('Diff pipeline offline');
        },
      },
    });

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-error-state"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Unable to load diff review');
    expect(mounted.container.textContent).toContain('Diff pipeline offline');
    expect(mounted.container.textContent).toContain('Diff Viewer');
  });

  it('keeps diff header and summary outside the scroll-owned body', async () => {
    mounted = await renderDiffView();

    await waitForDiffViewText(mounted, 'fct_sales', 'diff changes render before layout assertions');

    const header = mounted.container.querySelector('[data-slot="route-workbench-header"]');
    const body = mounted.container.querySelector('[data-slot="route-workbench-body"]');
    const compareCodes = Array.from(header?.querySelectorAll('code') ?? []);

    expect(header?.querySelector('[data-slot="diff-header"]')).not.toBeNull();
    expect(header?.querySelector('[data-slot="diff-summary-cards"]')).not.toBeNull();
    expect(body?.querySelector('[data-slot="diff-header"]')).toBeNull();
    expect(body?.querySelector('[data-slot="diff-summary-cards"]')).toBeNull();
    expect(body?.querySelector('[data-slot="diff-tabs"]')).not.toBeNull();
    expect(compareCodes.length).toBeGreaterThanOrEqual(2);
    expect(compareCodes[0]?.className).toContain('border');
    expect(compareCodes[1]?.className).toContain('border');
  });
});
