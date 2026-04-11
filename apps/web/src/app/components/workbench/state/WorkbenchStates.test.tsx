// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  WorkbenchDegradedState,
  WorkbenchEmptyState,
  WorkbenchErrorState,
  WorkbenchLoadingState,
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

  it('renders error, loading, and degraded primitives with governed tones', async () => {
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
        </>
      );
    });

    const errorCard = container.querySelector('[data-slot="runs-error-state"]');
    const loadingCard = container.querySelector('[data-slot="run-detail-loading-state"]');
    const degradedCard = container.querySelector('[data-slot="run-degraded-state"]');

    expect(errorCard?.textContent).toContain('Run list unavailable');
    expect(errorCard?.className).toContain('status-danger');
    expect(loadingCard?.textContent).toContain('Loading run workspace...');
    expect(degradedCard?.textContent).toContain('Timeline degraded');
    expect(degradedCard?.textContent).toContain('Snapshot truth is still available.');
    expect(degradedCard?.className).toContain('status-warning');
  });
});
