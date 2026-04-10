// @vitest-environment jsdom

import { AlertTriangle, DollarSign } from 'lucide-react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StatCard } from './StatCard';
import { StatusIndicator } from './StatusIndicator';
import { ViewHeader } from './ViewHeader';
import { ViewStateOverlay } from './ViewStateOverlay';

describe('domain components', () => {
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

  it('renders ViewHeader and StatCard', async () => {
    await act(async () => {
      root.render(
        <>
          <ViewHeader
            title="Cost"
            subtitle="Workspace cost summary"
            icon={<DollarSign className="size-5" />}
          />
          <StatCard
            icon={<DollarSign className="size-5" />}
            value="$10.50"
            label="Total observed node cost"
            tone="success"
          />
        </>
      );
    });

    expect(container.textContent).toContain('Cost');
    expect(container.textContent).toContain('Workspace cost summary');
    expect(container.textContent).toContain('$10.50');
    expect(container.textContent).toContain('Total observed node cost');
  });

  it('renders StatusIndicator and ViewStateOverlay', async () => {
    const onRetry = vi.fn();

    await act(async () => {
      root.render(
        <>
          <StatusIndicator
            state="warning"
            label="Warning"
            icon={<AlertTriangle className="size-3" />}
          />
          <ViewStateOverlay
            kind="error"
            title="Cost data unavailable"
            description="The current data source could not be loaded."
            action={{ label: 'Retry', onClick: onRetry }}
          />
        </>
      );
    });

    const statusIndicator = container.querySelector('[data-slot="status-indicator"]');
    const overlay = container.querySelector('[data-slot="view-state-overlay"]');

    expect(container.textContent).toContain('Warning');
    expect(container.textContent).toContain('Cost data unavailable');
    expect(container.textContent).toContain('Retry');
    expect(statusIndicator?.className).toContain('border-[color:var(--status-warning)]');
    expect(statusIndicator?.className).toContain('text-[var(--status-warning)]');
    expect(statusIndicator?.className).not.toContain('border-yellow-500');
    expect(overlay?.className).toContain('bg-[var(--surface-panel)]');
    expect(overlay?.className).toContain('border-[color:var(--border-default)]');
    expect(overlay?.innerHTML).toContain('text-[var(--status-danger)]');
    expect(overlay?.innerHTML).not.toContain('text-red-400');
  });
});
