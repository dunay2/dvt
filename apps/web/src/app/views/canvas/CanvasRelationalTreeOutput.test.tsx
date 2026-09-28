// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CanvasRelationalTreeOutput } from './CanvasRelationalTreeOutput';

describe('CanvasRelationalTreeOutput', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body
      .querySelectorAll('[data-slot="context-menu-content"]')
      .forEach((item) => item.remove());
    container.remove();
  });

  it('opens Output on left click and disconnects its port with Delete or the context menu', async () => {
    const onOpen = vi.fn();
    const onDisconnect = vi.fn();
    act(() => {
      root.render(
        <CanvasRelationalTreeOutput
          output={{ x: 320, y: 36, width: 156, height: 76, inputLocator: null }}
          outputName="Model"
          copy={resolveCanvasViewCopy('en')}
          onOpen={onOpen}
          connected
          selectedSource={null}
          onConnect={vi.fn()}
          onDisconnect={onDisconnect}
          movable
        />
      );
    });
    const port = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-output-input-port"]'
    )!;

    act(() => {
      fireEvent.click(port);
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onDisconnect).not.toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(port, { key: 'Delete' });
    });
    expect(onDisconnect).toHaveBeenCalledTimes(1);

    await act(async () => fireEvent.contextMenu(port));
    const remove = document.body.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-remove-connection"]'
    );
    expect(remove?.textContent).toContain('Remove connection');
    await act(async () => fireEvent.click(remove!));
    expect(onDisconnect).toHaveBeenCalledTimes(2);
  });
});
