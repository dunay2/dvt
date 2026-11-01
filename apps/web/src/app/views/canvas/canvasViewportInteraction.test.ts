// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  isCanvasInteractionControlTarget,
  resolveCanvasKeyboardAction,
  resolveCanvasViewportInteraction,
} from './canvasViewportInteraction';

describe('Canvas viewport interaction policy', () => {
  it.each([
    [{ key: 'Enter' }, 'activate'],
    [{ key: 'Enter', shiftKey: true }, 'activate'],
    [{ key: 'Enter', ctrlKey: true }, undefined],
    [{ key: 'f', ctrlKey: true }, 'search'],
    [{ key: 'F', metaKey: true }, 'search'],
    [{ key: 'f', altKey: true, ctrlKey: true }, undefined],
    [{ key: 'Escape' }, 'dismiss'],
    [{ key: 'ContextMenu' }, 'context-menu'],
    [{ key: 'F10', shiftKey: true }, 'context-menu'],
    [{ key: 'F10' }, undefined],
    [{ key: 'F10', shiftKey: true, ctrlKey: true }, undefined],
    [{ key: ' ' }, undefined],
    [{ key: 'Delete' }, undefined],
    [{ key: 'Backspace' }, undefined],
    [{ key: 'ArrowLeft' }, undefined],
  ] as const)('maps %j to the existing %s intent', (input, expected) => {
    expect(resolveCanvasKeyboardAction(new KeyboardEvent('keydown', input))).toBe(expected);
  });

  it('keeps deletion gated while preserving one native pointer policy', () => {
    const readOnly = resolveCanvasViewportInteraction(false);
    const editable = resolveCanvasViewportInteraction(true);
    expect(readOnly.flow.deleteKeyCode).toBeNull();
    expect(editable.flow.deleteKeyCode).toEqual(['Backspace', 'Delete']);
    expect(readOnly.controls.showInteractive).toBe(false);
    expect(editable.controls.showInteractive).toBe(false);
    expect(readOnly.flow.panOnDrag).toBe(editable.flow.panOnDrag);
    expect(editable.flow.deleteKeyCode).toBe(
      resolveCanvasViewportInteraction(true).flow.deleteKeyCode
    );
    expect(readOnly.flow).toEqual({ ...editable.flow, deleteKeyCode: null });
  });

  it.each(['input', 'textarea', 'select', 'button', 'summary', 'a'])(
    'preserves input owned by a native %s control',
    (tag) => {
      const control = document.createElement(tag);
      if (tag === 'a') control.setAttribute('href', '#');
      expect(isCanvasInteractionControlTarget(control)).toBe(true);
    }
  );

  it('honors editable and explicitly embedded control ancestors', () => {
    for (const attribute of ['contenteditable', 'data-canvas-node-control']) {
      const control = document.createElement('div');
      control.setAttribute(attribute, attribute === 'contenteditable' ? 'true' : '');
      const child = document.createElement('span');
      control.append(child);
      expect(isCanvasInteractionControlTarget(child)).toBe(true);
    }
    expect(isCanvasInteractionControlTarget(document.createElement('div'))).toBe(false);
    expect(isCanvasInteractionControlTarget(null)).toBe(false);
  });
});
