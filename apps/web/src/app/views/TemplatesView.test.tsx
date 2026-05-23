// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withTestQueryClient } from '../../testing/reactQueryHarness';
import TemplatesView from './TemplatesView';

vi.mock('../components/monaco/MonacoCodeViewer', () => ({
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

describe('TemplatesView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }

    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('renders the templates route workbench with catalog, parameters, and blocked preview', async () => {
    mounted = await withTestQueryClient(<TemplatesView />);

    expect(mounted.container.textContent).toContain('Templates');
    expect(mounted.container.textContent).toContain('Snowflake Task');
    expect(mounted.container.textContent).toContain('Snowflake Procedure');
    expect(mounted.container.textContent).toContain('ETL Scaffold');
    expect(mounted.container.textContent).toContain('Preview blocked');
    expect(mounted.container.textContent).toContain('Task name is required.');
    expect(mounted.container.textContent).toContain('Warehouse is required.');
    expect(mounted.container.querySelector('button[aria-pressed="true"]')?.textContent).toContain(
      'Snowflake Task'
    );
    expect(
      mounted.container.querySelector('input[name="taskName"]')?.getAttribute('aria-describedby')
    ).toBe('template-parameter-taskName-error');
    expect(mounted.container.querySelector('[data-slot="route-workbench-frame"]')).not.toBeNull();
    expect(
      mounted.container.querySelector('[data-slot="templates-generated-source-preview"]')
    ).toBeNull();
    expect(mounted.container.querySelector('[data-testid="monaco-code-viewer"]')).toBeNull();
  });

  it('updates parameter state and renders deterministic generated source preview', async () => {
    mounted = await withTestQueryClient(<TemplatesView />);

    await act(async () => {
      fireEvent.input(
        mounted?.container.querySelector('input[name="taskName"]') as HTMLInputElement,
        {
          target: { value: 'load_orders' },
        }
      );
      fireEvent.input(
        mounted?.container.querySelector('input[name="warehouse"]') as HTMLInputElement,
        {
          target: { value: 'transforming_wh' },
        }
      );
      fireEvent.input(
        mounted?.container.querySelector('textarea[name="sqlBody"]') as HTMLTextAreaElement,
        {
          target: { value: 'call analytics.load_orders();' },
        }
      );
    });

    const preview = mounted.container.querySelector(
      '[data-slot="templates-generated-source-preview"]'
    );
    const viewer = mounted.container.querySelector('[data-testid="monaco-code-viewer"]');

    expect(mounted.container.textContent).toContain('Preview ready');
    expect(mounted.container.textContent).toContain('load_orders.task.sql');
    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute('data-language')).toBe('sql');
    expect(viewer?.getAttribute('data-path')).toBe('load_orders.task.sql');
    expect(preview?.textContent).toContain('create or replace task load_orders');
    expect(preview?.textContent).toContain('warehouse = transforming_wh');
    expect(preview?.textContent).toContain('call analytics.load_orders();');
  });
});
