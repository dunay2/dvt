// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GraphNodeStatusChip } from './GraphNodeStatusChip';

describe('GraphNodeStatusChip', () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousActEnvironment: boolean | undefined;

  beforeEach(() => {
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    if (previousActEnvironment === undefined) {
      Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
    } else {
      globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });

  it('renders the already-projected status label without deriving card state', () => {
    act(() => {
      root.render(<GraphNodeStatusChip status={{ label: 'Ready', tone: 'success' }} />);
    });

    const chip = container.querySelector('[data-slot="graph-node-status-chip"]');
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toBe('Ready');
  });

  it('uses tone tokens for warning status presentation', () => {
    act(() => {
      root.render(<GraphNodeStatusChip status={{ label: 'Draft', tone: 'warning' }} />);
    });

    const chip = container.querySelector('[data-slot="graph-node-status-chip"]');
    expect(chip?.className).toContain('text-amber-200');
    expect(chip?.textContent).toBe('Draft');
  });

  it('uses a dedicated running tone token instead of the generic info token', () => {
    act(() => {
      root.render(<GraphNodeStatusChip status={{ label: 'Running', tone: 'running' }} />);
    });

    const chip = container.querySelector('[data-slot="graph-node-status-chip"]');
    expect(chip?.className).toContain('text-sky-200');
    expect(chip?.className).not.toContain('text-blue-200');
    expect(chip?.textContent).toBe('Running');
  });
});
