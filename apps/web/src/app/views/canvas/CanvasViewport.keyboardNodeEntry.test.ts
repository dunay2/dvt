// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { activateFocusedCanvasNodeFromKeyboard } from './CanvasViewportSurfaceView';

function buildKeyboardEvent(target: EventTarget, key = 'Enter') {
  return {
    key,
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

describe('CanvasViewport keyboard node entry', () => {
  it('routes Enter on a focused React Flow node through the same node-open gesture', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'react-flow__node';
    const shell = document.createElement('div');
    shell.setAttribute('data-slot', 'canvas-node-shell');
    wrapper.append(shell);
    document.body.append(wrapper);
    const onDoubleClick = vi.fn();
    shell.addEventListener('dblclick', onDoubleClick);
    const event = buildKeyboardEvent(wrapper);

    try {
      expect(
        activateFocusedCanvasNodeFromKeyboard(
          event as unknown as Parameters<typeof activateFocusedCanvasNodeFromKeyboard>[0]
        )
      ).toBe(true);
      expect(onDoubleClick).toHaveBeenCalledOnce();
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(event.stopPropagation).toHaveBeenCalledOnce();
    } finally {
      wrapper.remove();
    }
  });

  it('does not enter the node when Enter belongs to an embedded node control', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'react-flow__node';
    const shell = document.createElement('div');
    shell.setAttribute('data-slot', 'canvas-node-shell');
    const actions = document.createElement('button');
    actions.setAttribute('data-canvas-node-control', '');
    shell.append(actions);
    wrapper.append(shell);
    document.body.append(wrapper);
    const onDoubleClick = vi.fn();
    shell.addEventListener('dblclick', onDoubleClick);
    const event = buildKeyboardEvent(actions);

    try {
      expect(
        activateFocusedCanvasNodeFromKeyboard(
          event as unknown as Parameters<typeof activateFocusedCanvasNodeFromKeyboard>[0]
        )
      ).toBe(false);
      expect(onDoubleClick).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
    } finally {
      wrapper.remove();
    }
  });

  it('ignores unrelated keys', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'react-flow__node';
    const shell = document.createElement('div');
    shell.setAttribute('data-slot', 'canvas-node-shell');
    wrapper.append(shell);
    const event = buildKeyboardEvent(wrapper, 'Space');

    expect(
      activateFocusedCanvasNodeFromKeyboard(
        event as unknown as Parameters<typeof activateFocusedCanvasNodeFromKeyboard>[0]
      )
    ).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
