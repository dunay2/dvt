// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { activateFocusedCanvasNodeFromKeyboard } from './canvasViewportInteraction';

type KeyboardEventDouble = Readonly<{
  key: string;
  target: EventTarget;
  preventDefault: ReturnType<typeof vi.fn>;
  stopPropagation: ReturnType<typeof vi.fn>;
}>;

function buildKeyboardEvent(target: EventTarget, key = 'Enter'): KeyboardEventDouble {
  return {
    key,
    target,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

describe('CanvasViewport keyboard node entry', () => {
  it.each([
    ['open', 'dblclick', 2],
    ['inspect', 'click', 0],
  ] as const)('routes Enter through the declared %s action', (activation, type, detail) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'react-flow__node';
    const shell = document.createElement('div');
    shell.setAttribute('data-slot', 'canvas-node-shell');
    shell.setAttribute('data-canvas-node-activation', activation);
    wrapper.append(shell);
    document.body.append(wrapper);
    const onDoubleClick = vi.fn();
    const onClick = vi.fn();
    shell.addEventListener('dblclick', onDoubleClick);
    shell.addEventListener('click', onClick);
    const event = buildKeyboardEvent(wrapper);

    try {
      expect(
        activateFocusedCanvasNodeFromKeyboard(
          event as unknown as Parameters<typeof activateFocusedCanvasNodeFromKeyboard>[0]
        )
      ).toBe(true);
      const action = type === 'dblclick' ? onDoubleClick : onClick;
      const otherAction = type === 'dblclick' ? onClick : onDoubleClick;
      expect(action).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ type, detail }));
      expect(otherAction).not.toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(event.stopPropagation).toHaveBeenCalledOnce();
    } finally {
      wrapper.remove();
    }
  });

  it.each([undefined, 'unsupported'])(
    'does not invent an action for capability %s',
    (activation) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'react-flow__node';
      const shell = document.createElement('div');
      shell.setAttribute('data-slot', 'canvas-node-shell');
      if (activation) shell.setAttribute('data-canvas-node-activation', activation);
      wrapper.append(shell);
      const action = vi.fn();
      shell.addEventListener('dblclick', action);
      shell.addEventListener('click', action);
      const event = buildKeyboardEvent(wrapper);

      expect(
        activateFocusedCanvasNodeFromKeyboard(
          event as unknown as Parameters<typeof activateFocusedCanvasNodeFromKeyboard>[0]
        )
      ).toBe(false);
      expect(action).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
    }
  );

  it('does not enter the node when Enter belongs to an embedded node control', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'react-flow__node';
    const shell = document.createElement('div');
    shell.setAttribute('data-slot', 'canvas-node-shell');
    shell.setAttribute('data-canvas-node-activation', 'open');
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
    shell.setAttribute('data-canvas-node-activation', 'open');
    wrapper.append(shell);
    const event = buildKeyboardEvent(wrapper, 'Space');

    expect(
      activateFocusedCanvasNodeFromKeyboard(
        event as unknown as Parameters<typeof activateFocusedCanvasNodeFromKeyboard>[0]
      )
    ).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it.each(['input', 'textarea', 'select', 'button'])(
    'leaves Enter on a native %s to that control without opening its card',
    (tag) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'react-flow__node';
      const shell = document.createElement('div');
      shell.setAttribute('data-slot', 'canvas-node-shell');
      shell.setAttribute('data-canvas-node-activation', 'open');
      const control = document.createElement(tag);
      shell.append(control);
      wrapper.append(shell);
      const open = vi.fn();
      shell.addEventListener('dblclick', open);
      const event = buildKeyboardEvent(control);

      expect(
        activateFocusedCanvasNodeFromKeyboard(
          event as unknown as Parameters<typeof activateFocusedCanvasNodeFromKeyboard>[0]
        )
      ).toBe(false);
      expect(open).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
    }
  );
});
