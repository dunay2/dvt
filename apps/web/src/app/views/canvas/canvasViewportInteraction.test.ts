// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  isCanvasInteractionControlTarget,
  isCanvasTextEditingTarget,
  isCanvasBackgroundTarget,
  resolveCanvasKeyboardAction,
  resolveCanvasViewportInteraction,
} from './canvasViewportInteraction';

describe('Canvas viewport interaction policy', () => {
  it.each([
    [{ key: 'Enter' }, 'activate'],
    [{ key: 'Enter', shiftKey: true }, 'activate'],
    [{ key: 'Enter', ctrlKey: true }, undefined],
    [{ key: 'Enter', repeat: true }, undefined],
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

  it.each(['input', 'textarea', 'select', 'div'])(
    'keeps text editing local for %s without treating ordinary card buttons as text editors',
    (tag) => {
      const field = document.createElement(tag);
      if (tag === 'div') field.setAttribute('contenteditable', 'plaintext-only');
      expect(isCanvasTextEditingTarget(field)).toBe(true);
      if (tag === 'div') {
        const child = document.createElement('span');
        field.append(child);
        expect(isCanvasTextEditingTarget(child)).toBe(true);
      }
      expect(isCanvasTextEditingTarget(document.createElement('button'))).toBe(false);
    }
  );

  it.each([
    '[data-relational-card-id]',
    '[data-slot="canvas-relational-card"]',
    '.react-flow__node',
  ])('keeps %s out of background gestures', (selector) => {
    const boundary = document.createElement('div');
    const card = document.createElement('div');
    if (selector.startsWith('.')) card.className = selector.slice(1);
    else if (selector.includes('data-slot'))
      card.setAttribute('data-slot', 'canvas-relational-card');
    else card.setAttribute('data-relational-card-id', 'card');
    const label = document.createElement('span');
    card.append(label);
    boundary.append(card);
    expect(isCanvasBackgroundTarget(label, boundary)).toBe(false);
    expect(isCanvasBackgroundTarget(boundary, boundary)).toBe(true);
  });

  it('rejects portalled targets and missing surfaces rather than treating them as background', () => {
    const boundary = document.createElement('div');
    expect(isCanvasBackgroundTarget(document.createElement('div'), boundary)).toBe(false);
    expect(isCanvasBackgroundTarget(null, boundary)).toBe(false);
    expect(isCanvasBackgroundTarget(boundary, null)).toBe(false);
  });

  it('recognizes background and protected controls in their own iframe window', () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    try {
      const doc = frame.contentDocument!;
      const boundary = doc.createElement('div');
      doc.body.append(boundary);
      const input = doc.createElement('input');
      const marker = doc.createElement('div');
      marker.setAttribute('data-canvas-node-control', '');
      boundary.append(input, marker);
      expect(isCanvasBackgroundTarget(boundary, boundary)).toBe(true);
      expect(isCanvasTextEditingTarget(input)).toBe(true);
      expect(isCanvasInteractionControlTarget(marker)).toBe(true);
      expect(isCanvasBackgroundTarget(input, boundary)).toBe(false);
      expect(isCanvasBackgroundTarget(marker, boundary)).toBe(false);
    } finally {
      frame.remove();
    }
  });
});
