// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode } from './DvtAuthoringFields.test-fixtures';

describe('DVT materialization authoring', () => {
  const view = useAuthoringFieldsHarness();
  it('renders native Transform materialization in General and updates the canonical draft', () => {
    view.renderFields(
      buildDvtNode('dvt:transform', {
        config: { materialized: 'table' },
      }),
      undefined,
      undefined,
      undefined,
      undefined,
      'general'
    );

    const select = view.container.querySelector(
      'select[name="dvt-transform-materialization"]'
    ) as HTMLSelectElement | null;

    expect(select?.value).toBe('table');
    expect([...select!.options].map((option) => option.value)).toEqual(['view', 'table']);
    expect(view.draftJson()).not.toContain('"dbt"');

    act(() => {
      fireEvent.change(select!, { target: { value: 'view' } });
    });

    expect(view.draftJson()).toContain('"materialized":"view"');
    expect(view.draftJson()).not.toContain('"dbt"');
  });

  it('renders sink destination posture and updates materialization controls', () => {
    view.renderFields(
      buildDvtNode('dvt:sink', {
        config: {
          database: 'analytics_prod',
          schema: 'marts',
          table: 'orders_daily',
          materialization: 'view',
          writeMode: 'append',
          partitionStrategy: 'daily_by_order_date',
        },
      })
    );

    const materializationSelect = view.container.querySelector(
      'select[name="dvt-sink-materialization"]'
    ) as HTMLSelectElement | null;
    const writeModeSelect = view.container.querySelector(
      'select[name="dvt-sink-write-mode"]'
    ) as HTMLSelectElement | null;
    expect(view.container.textContent).toContain('DVT sink');
    expect(view.container.textContent).toContain('marts.orders_daily');
    expect(view.container.textContent).not.toContain('analytics_prod.marts.orders_daily');
    expect(view.container.textContent).not.toContain('daily_by_order_date');
    expect(view.container.querySelector('input[name="dvt-sink-database"]')).toBeNull();
    expect(view.container.querySelector('input[name="dvt-sink-partition-strategy"]')).toBeNull();
    expect(materializationSelect?.value).toBe('view');
    expect(writeModeSelect?.value).toBe('append');

    act(() => {
      fireEvent.change(materializationSelect!, { target: { value: 'table' } });
      fireEvent.change(writeModeSelect!, { target: { value: 'replace' } });
    });

    expect(view.draftJson()).not.toContain('database');
    expect(view.draftJson()).toContain('"materialization":"table"');
    expect(view.draftJson()).toContain('"writeMode":"replace"');
    expect(view.draftJson()).not.toContain('partitionStrategy');
  });
});
