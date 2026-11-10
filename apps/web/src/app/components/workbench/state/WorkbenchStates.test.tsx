// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Activity } from 'lucide-react';
import { ShellRouteHeadingProvider } from '../../shell/ShellRouteHeading';

import {
  WorkbenchDegradedState,
  WorkbenchEmptyState,
  WorkbenchErrorState,
  WorkbenchLoadingState,
  WorkbenchReadOnlyState,
  WorkbenchStateFrame,
} from './WorkbenchStates';

describe('WorkbenchStates', () => {
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
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders the shared frame with configurable slot prefixes', async () => {
    await act(async () => {
      root.render(
        <WorkbenchStateFrame title="Runs" slotPrefix="runs-state">
          <div>State body</div>
        </WorkbenchStateFrame>
      );
    });

    const frame = container.querySelector('[data-slot="runs-state-frame"]');
    const header = container.querySelector('[data-slot="runs-state-header"]');
    const body = container.querySelector('[data-slot="runs-state-body"]');

    expect(frame).not.toBeNull();
    expect(header?.textContent).toContain('Runs');
    expect(body?.textContent).toContain('State body');
  });

  it.each(['Runs', 'Ejecuciones'])(
    'omits only the title already rendered by the shell (%s)',
    async (title) => {
      // The old state-frame heading spent a second large band below the shell's identical title.
      await act(async () => {
        root.render(
          <ShellRouteHeadingProvider heading={{ title, icon: Activity }}>
            <WorkbenchStateFrame title={title} slotPrefix="runs-state">
              <input aria-label="Retained body" defaultValue="filter" />
            </WorkbenchStateFrame>
          </ShellRouteHeadingProvider>
        );
      });
      const input = container.querySelector('input');
      input?.focus();
      expect(container.querySelector('[data-slot="runs-state-header"]')).toBeNull();
      await act(async () => {
        root.render(
          <ShellRouteHeadingProvider heading={null}>
            <WorkbenchStateFrame title={title} slotPrefix="runs-state">
              <input aria-label="Retained body" defaultValue="filter" />
            </WorkbenchStateFrame>
          </ShellRouteHeadingProvider>
        );
      });
      expect(container.querySelector('h1')?.textContent).toBe(title);
      expect(container.querySelector('input')).toBe(input);
      expect(document.activeElement).toBe(input);
    }
  );

  it('retains a distinct detail title and an embedded title without a shell heading', async () => {
    // A shared shell caption must not hide a Run identity or another route's meaningful heading.
    await act(async () => {
      root.render(
        <ShellRouteHeadingProvider heading={{ title: 'Runs', icon: Activity }}>
          <WorkbenchStateFrame title="Run run_1">
            <p>Detail</p>
          </WorkbenchStateFrame>
        </ShellRouteHeadingProvider>
      );
    });
    expect(container.querySelector('h1')?.textContent).toBe('Run run_1');
    await act(async () => {
      root.render(
        <WorkbenchStateFrame title="Runs">
          <p>Embedded</p>
        </WorkbenchStateFrame>
      );
    });
    expect(container.querySelector('h1')?.textContent).toBe('Runs');
  });

  it('preserves error explanations and recovery actions when only the frame title is redundant', async () => {
    // Matching a shell title must never hide a denial cause, empty-state explanation or real recovery link.
    await act(async () => {
      root.render(
        <ShellRouteHeadingProvider heading={{ title: 'Runs', icon: Activity }}>
          <WorkbenchErrorState
            frameTitle="Runs"
            title="Run list unavailable"
            message="The current workspace is denied."
          />
          <WorkbenchEmptyState
            frameTitle="Runs"
            title="No runs available"
            message="Start an execution from Canvas."
            action={<a href="/canvas">Open Canvas</a>}
          />
        </ShellRouteHeadingProvider>
      );
    });
    expect(container.querySelector('h1')).toBeNull();
    expect(container.textContent).toContain('Run list unavailable');
    expect(container.textContent).toContain('The current workspace is denied.');
    expect(container.textContent).toContain('Start an execution from Canvas.');
    expect(container.querySelector('a[href="/canvas"]')?.textContent).toBe('Open Canvas');
  });

  it('makes state-frame bodies independently scrollable inside fixed workbench shells', async () => {
    await act(async () => {
      root.render(
        <WorkbenchStateFrame title="Runs" slotPrefix="runs-state">
          <div>Long state body</div>
        </WorkbenchStateFrame>
      );
    });

    const body = container.querySelector('[data-slot="runs-state-body"]');

    expect(body?.className).toContain('min-h-0');
    expect(body?.className).toContain('overflow-y-auto');
  });

  it('renders an empty state with optional action content', async () => {
    await act(async () => {
      root.render(
        <WorkbenchEmptyState
          frameTitle="Runs"
          title="No runs available"
          message="Go back to canvas."
          dataSlot="runs-empty-state"
          centered
          action={<a href="/canvas">Open canvas</a>}
        />
      );
    });

    const card = container.querySelector('[data-slot="runs-empty-state"]');

    expect(card?.textContent).toContain('No runs available');
    expect(card?.textContent).toContain('Go back to canvas.');
    expect(card?.textContent).toContain('Open canvas');
    expect(card?.className).toContain('text-center');
  });

  it('renders error, loading, degraded, and read-only primitives with governed tones', async () => {
    await act(async () => {
      root.render(
        <>
          <WorkbenchErrorState
            frameTitle="Runs"
            title="Run list unavailable"
            message="Runtime service is unavailable."
            dataSlot="runs-error-state"
          />
          <WorkbenchLoadingState
            frameTitle="Run run_123"
            message="Loading run workspace..."
            dataSlot="run-detail-loading-state"
          />
          <WorkbenchDegradedState
            title="Timeline degraded"
            message="Timeline is temporarily unavailable."
            note="Snapshot truth is still available."
            dataSlot="run-degraded-state"
          />
          <WorkbenchReadOnlyState
            title="Read-only preview"
            message="Browse files here."
            note="Editing belongs outside this route."
            dataSlot="code-readonly-state"
          />
        </>
      );
    });

    const errorCard = container.querySelector('[data-slot="runs-error-state"]');
    const loadingCard = container.querySelector('[data-slot="run-detail-loading-state"]');
    const degradedCard = container.querySelector('[data-slot="run-degraded-state"]');
    const readOnlyCard = container.querySelector('[data-slot="code-readonly-state"]');

    expect(errorCard?.textContent).toContain('Run list unavailable');
    expect(errorCard?.className).toContain('status-danger');
    expect(loadingCard?.textContent).toContain('Loading run workspace...');
    expect(degradedCard?.textContent).toContain('Timeline degraded');
    expect(degradedCard?.textContent).toContain('Snapshot truth is still available.');
    expect(degradedCard?.className).toContain('status-warning');
    expect(readOnlyCard?.textContent).toContain('Read-only preview');
    expect(readOnlyCard?.textContent).toContain('Editing belongs outside this route.');
    expect(readOnlyCard?.className).toContain('status-readonly');
  });
});
