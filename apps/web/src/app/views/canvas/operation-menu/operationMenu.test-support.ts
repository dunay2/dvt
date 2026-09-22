/** Owned concern: supply browser layout APIs absent in jsdom and explicit menu gestures. */
import { act } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';

export function setupOperationMenuDom(): void {
  const scroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (scroll) Object.defineProperty(Element.prototype, 'scrollIntoView', scroll);
    else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });
}

export function openOperationMenu(container: HTMLElement): void {
  act(() =>
    container
      .querySelector<HTMLButtonElement>('[data-slot="canvas-operation-menu-trigger"]')!
      .click()
  );
}
