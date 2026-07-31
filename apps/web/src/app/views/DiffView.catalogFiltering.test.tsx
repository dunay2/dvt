// @vitest-environment jsdom

import { waitFor } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockGraphDraftAuthoringAuthority } from '../../testing/workspacePortDoubles';
import {
  activateDiffViewButton,
  findDiffViewButton,
  type DiffViewMounted,
  installDiffViewDomDoubles,
  renderDiffView,
  waitForDiffViewText,
} from './test/DiffViewHarness';

describe('DiffView catalog and filtering', () => {
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

  it('derives catalog summary highlights from the actual diff document', async () => {
    mounted = await renderDiffView({
      diff: {
        getDiffChanges: async () => [
          {
            id: '3',
            nodeId: 'fct_sales',
            type: 'changed',
            severity: 'warning',
            description: 'Column type changed: order_date',
            oldValue: 'DATE',
            newValue: 'TIMESTAMP',
          },
          {
            id: '4',
            nodeId: 'fct_sales',
            type: 'added',
            severity: 'info',
            description: 'Column added: gross_amount',
            oldValue: null,
            newValue: 'gross_amount NUMERIC(18,2)',
          },
        ],
      },
    });

    await waitForDiffViewText(
      mounted,
      'fct_sales',
      'diff changes render before catalog assertions'
    );

    const catalogTab = findDiffViewButton('Catalog Diff');
    expect(catalogTab).toBeTruthy();

    await activateDiffViewButton(catalogTab);

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-catalog-summary"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('order_date');
    expect(mounted.container.textContent).toContain('DATE -> TIMESTAMP');
    expect(mounted.container.textContent).toContain('gross_amount');
    expect(mounted.container.textContent).toContain('NUMERIC(18,2)');
    expect(mounted.container.textContent).toContain('Column Added');
    expect(mounted.container.textContent).toContain('Type Changed');
    expect(mounted.container.textContent).not.toContain('discount_amount');
    expect(mounted.container.textContent).not.toContain('Column Removed');
  });

  it('filters to breaking changes only', async () => {
    mounted = await renderDiffView({
      graph: {
        getGraphSnapshot: async () => ({
          authoringAuthority: mockGraphDraftAuthoringAuthority,
          nodes: [
            {
              id: 'dim_store',
              name: 'dim_store',
              type: 'MODEL',
              package: 'analytics',
              path: 'models/dimensions/dim_store.sql',
              tags: [],
              status: 'success',
              dependencies: [],
              compiledSql: [
                'SELECT',
                '  s.store_id,',
                '  s.store_name',
                'FROM raw.store_dim s',
              ].join('\n'),
              columns: [
                { name: 'store_id', type: 'INTEGER', nullable: false },
                { name: 'store_name', type: 'TEXT', nullable: false },
                { name: 'store_city', type: 'TEXT', nullable: true },
              ],
            },
            {
              id: 'fct_sales',
              name: 'fct_sales',
              type: 'MODEL',
              package: 'analytics',
              path: 'models/marts/fct_sales.sql',
              tags: [],
              status: 'success',
              dependencies: ['stg_orders', 'dim_store'],
              compiledSql: [
                'SELECT',
                '  o.order_id,',
                '  o.customer_id,',
                '  o.order_date,',
                '  s.store_id,',
                '  o.total_amount',
                'FROM {{ ref("stg_orders") }} o',
                'LEFT JOIN {{ ref("dim_store") }} s',
                '  ON o.store_id = s.store_id',
              ].join('\n'),
              columns: [
                { name: 'order_id', type: 'INTEGER', nullable: false },
                { name: 'customer_id', type: 'INTEGER', nullable: false },
                { name: 'order_date', type: 'DATE', nullable: false },
                { name: 'store_id', type: 'INTEGER', nullable: true },
                { name: 'total_amount', type: 'NUMERIC(18,2)', nullable: true },
              ],
            },
          ],
          edges: [],
        }),
      },
      diff: {
        getDiffChanges: async () => [
          {
            id: '1',
            nodeId: 'dim_store',
            type: 'added',
            severity: 'info',
            description: 'Column added: store_region',
            oldValue: null,
            newValue: 'store_region TEXT',
          },
          {
            id: '2',
            nodeId: 'fct_sales',
            type: 'changed',
            severity: 'breaking',
            description: 'Column removed: discount_amount',
            oldValue: 'discount_amount DECIMAL',
            newValue: null,
          },
        ],
      },
    });

    await waitForDiffViewText(mounted, 'dim_store', 'initial diff changes render for both nodes');

    const breakingButton = findDiffViewButton('Breaking Only');
    expect(breakingButton).toBeTruthy();

    await activateDiffViewButton(breakingButton);

    await waitFor(() => {
      expect(mounted?.container.textContent).toContain('fct_sales');
      expect(mounted?.container.textContent).not.toContain('dim_store');
    });

    const sqlTab = findDiffViewButton('SQL Diff');
    expect(sqlTab).toBeTruthy();

    await activateDiffViewButton(sqlTab);

    await waitFor(() => {
      expect(sqlTab?.getAttribute('data-state')).toBe('active');
      expect(mounted?.container.querySelector('[data-testid="monaco-diff-viewer"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('Compiled SQL Diff: fct_sales');
    expect(mounted.container.textContent).toContain('models/marts/fct_sales.sql (current)');
    expect(mounted.container.textContent).not.toContain('dim_store (current)');

    const catalogTab = findDiffViewButton('Catalog Diff');
    expect(catalogTab).toBeTruthy();

    await activateDiffViewButton(catalogTab);

    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-slot="diff-catalog-summary"]')).not.toBeNull();
    });

    expect(mounted.container.textContent).toContain('fct_sales');
    expect(mounted.container.textContent).toContain('discount_amount');
    expect(mounted.container.textContent).toContain('Column Removed');
    expect(mounted.container.textContent).not.toContain('store_region');
    expect(mounted.container.textContent).not.toContain('Column Added');
  });
});
