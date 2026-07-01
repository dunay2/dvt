// @vitest-environment jsdom

import { ReactFlowProvider } from '@xyflow/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CanvasNodePortHandle } from './CanvasNodePortHandle';

describe('CanvasNodePortHandle', () => {
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

  it('renders a stable source port handle with caller-owned accessible copy', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodePortHandle
            kind="source"
            id="orders-output"
            tone="source"
            label="Connect orders output"
          />
        </ReactFlowProvider>
      );
    });

    const handle = container.querySelector('[data-slot="canvas-node-port-handle"]');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-port')).toBe('source');
    expect(handle?.getAttribute('data-tone')).toBe('source');
    expect(handle?.getAttribute('data-handleid')).toBe('orders-output');
    expect(handle?.getAttribute('aria-label')).toBe('Connect orders output');
  });

  it('renders passive compatibility hints without deciding edge admission', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodePortHandle
            kind="target"
            id="model-input"
            tone="model"
            label="Connect model input"
            compatibility={{
              state: 'blocked',
              compatibleNodeNames: ['Source 1'],
              description: 'Connect a source or model before this transform.',
            }}
          />
        </ReactFlowProvider>
      );
    });

    const handle = container.querySelector('[data-slot="canvas-node-port-handle"]');
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-port')).toBe('target');
    expect(handle?.getAttribute('data-tone')).toBe('model');
    expect(handle?.getAttribute('data-port-compatibility')).toBe('blocked');
    expect(handle?.getAttribute('title')).toBe('Connect a source or model before this transform.');
  });

  it('renders human compatible node labels as an accessible visual hint', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasNodePortHandle
            kind="source"
            id="source-output"
            tone="source"
            label="Connect source output"
            compatibility={{
              state: 'available',
              compatibleNodeNames: ['Orders Model', 'Snapshot 1'],
              description: 'Compatible with Orders Model, Snapshot 1.',
            }}
          />
        </ReactFlowProvider>
      );
    });

    const handle = container.querySelector('[data-slot="canvas-node-port-handle"]');
    const hint = container.querySelector('[data-slot="canvas-node-port-compatibility-hint"]');

    expect(handle).not.toBeNull();
    expect(hint).not.toBeNull();
    expect(hint?.textContent).toBe('Orders Model, Snapshot 1');
    expect(handle?.getAttribute('aria-describedby')).toBe(hint?.getAttribute('id'));
    expect(hint?.getAttribute('data-port')).toBe('source');
    expect(hint?.getAttribute('data-port-compatibility')).toBe('available');
  });
});
