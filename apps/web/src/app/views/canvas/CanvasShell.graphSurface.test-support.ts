import { expect } from 'vitest';
import { createCanvasShellHarness } from './CanvasShell.testHarness';

export interface CanvasShellGraphSurfaceTestContext {
  container: HTMLDivElement;
  navigation: HTMLDivElement;
  renderShell: ReturnType<typeof createCanvasShellHarness>['render'];
  unmountShell: () => void;
}

export function createGraphSurfaceTestContext(
  harness: ReturnType<typeof createCanvasShellHarness>
): CanvasShellGraphSurfaceTestContext {
  return {
    container: harness.container,
    navigation: harness.navigation,
    renderShell: harness.render,
    unmountShell: harness.unmount,
  };
}

export function requireGraphShellElement<T extends Element>(
  element: T | null | undefined,
  label: string
): T {
  expect(element, `Expected ${label} presentation`).not.toBeNull();
  if (!element) throw new Error(`Expected ${label} presentation`);
  return element;
}
