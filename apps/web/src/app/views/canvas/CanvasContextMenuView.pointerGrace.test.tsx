// @vitest-environment jsdom

import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { buildCanvasContextMenuModel } from './canvasInteractionCommandSurface';
import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { CanvasContextMenuView } from './CanvasContextMenuView';

describe('CanvasContextMenuView pointer grace', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    useApplicationLanguageStore.setState({ language: 'en' });
    const globalObject = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    globalObject.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('dismisses a pointer-opened command surface after the shared grace', () => {
    const onClose = vi.fn();
    renderMenu({ onClose });
    act(() => {
      container
        .querySelector<HTMLElement>('[data-slot="canvas-context-menu-trigger"]')!
        .dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            button: 2,
            clientX: 100,
            clientY: 100,
          })
        );
    });

    expect(document.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(1_000));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the keyboard command surface open without a pointer timeout', () => {
    const onClose = vi.fn();
    renderMenu({ onClose, keyboardMenuOpen: true });

    act(() => vi.advanceTimersByTime(2_000));

    expect(document.querySelector('[data-slot="canvas-context-menu"]')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  function renderMenu(args: { onClose: () => void; keyboardMenuOpen?: boolean }): void {
    const model = buildCanvasContextMenuModel({
      target: {
        kind: 'pane',
        screenPosition: { x: 100, y: 100 },
        flowPosition: { x: 100, y: 100 },
      },
      canMutateGraph: true,
      canOpenCanvasSettings: true,
      authoringNodeKinds: [buildTestNodeKind('dvt:source', 'Source')],
    });
    act(() =>
      root.render(
        <CanvasContextMenuView
          model={model}
          keyboardMenuOpen={args.keyboardMenuOpen}
          menuRef={createRef<HTMLDivElement>()}
          onClose={args.onClose}
          onCatalogClose={vi.fn()}
          onCanvasAction={vi.fn()}
          onCreateNodeAction={vi.fn()}
          onEdgeAction={vi.fn()}
        >
          <div />
        </CanvasContextMenuView>
      )
    );
  }
});
