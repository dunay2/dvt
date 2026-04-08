// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CalendarChevron } from './calendar';

describe('CalendarChevron', () => {
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

  async function renderChevron(orientation?: 'left' | 'right' | 'up' | 'down') {
    await act(async () => {
      root.render(<CalendarChevron orientation={orientation} />);
    });

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    return svg as SVGElement;
  }

  it('renders the right chevron by default', async () => {
    const svg = await renderChevron();

    expect(svg.getAttribute('class')).toContain('lucide-chevron-right');
    expect(svg.getAttribute('class')).toContain('size-4');
  });

  it('renders the left chevron when requested', async () => {
    const svg = await renderChevron('left');

    expect(svg.getAttribute('class')).toContain('lucide-chevron-left');
  });

  it('renders the up chevron when requested', async () => {
    const svg = await renderChevron('up');

    expect(svg.getAttribute('class')).toContain('lucide-chevron-up');
  });

  it('renders the down chevron when requested', async () => {
    const svg = await renderChevron('down');

    expect(svg.getAttribute('class')).toContain('lucide-chevron-down');
  });
});
