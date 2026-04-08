// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Calendar } from './calendar';

describe('Calendar', () => {
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

  it('wires the day-picker chevrons through the calendar override', async () => {
    await act(async () => {
      root.render(
        <Calendar
          captionLayout="dropdown"
          defaultMonth={new Date(2026, 3, 1)}
          fromYear={2020}
          toYear={2030}
        />
      );
    });

    expect(container.querySelector('svg.lucide-chevron-left.size-4')).not.toBeNull();
    expect(container.querySelector('svg.lucide-chevron-right.size-4')).not.toBeNull();
    expect(container.querySelector('svg.lucide-chevron-down.size-4')).not.toBeNull();
  });
});
