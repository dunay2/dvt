// @vitest-environment jsdom
/** Prove the geometry adapter publishes only current user gestures, never restoration or measurement. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  OPERATIONAL_DRAWER_GROUP_ID,
  useOperationalDrawerResize,
} from './useOperationalDrawerResize';
import type { ImperativePanelHandle } from '../ui/resizable';

let root: Root;
let container: HTMLDivElement;
let groupHeight: number;
let size: number;
let adapter: ReturnType<typeof useOperationalDrawerResize>;
const onHeightChange = vi.fn<(height: number) => void>();
const panel: ImperativePanelHandle = {
  getId: () => 'drawer',
  getSize: () => size,
  isCollapsed: () => false,
  isExpanded: () => true,
  collapse: () => {
    throw new Error('Unexpected collapse command');
  },
  expand: () => {
    throw new Error('Unexpected expand command');
  },
  resize: (next) => {
    size = next;
    adapter.onResize(next);
  },
};

function Harness({
  height = 320,
  visible = true,
}: {
  height?: number;
  visible?: boolean;
}): JSX.Element {
  adapter = useOperationalDrawerResize({ height, visible, onHeightChange });
  adapter.panelRef.current = panel;
  return (
    <div ref={adapter.groupHostRef}>
      <div data-panel-group-id={OPERATIONAL_DRAWER_GROUP_ID} />
      <button
        aria-label="Resize drawer"
        onKeyDownCapture={adapter.onKeyDownCapture}
        onKeyUpCapture={adapter.onKeyUpCapture}
        onBlur={adapter.onBlur}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') panel.resize(size + 5);
        }}
      />
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('ResizeObserver', undefined);
  vi.stubGlobal('innerHeight', 1200);
  groupHeight = 800;
  size = 22;
  onHeightChange.mockClear();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    return {
      height: this.dataset.panelGroupId === OPERATIONAL_DRAWER_GROUP_ID ? groupHeight : 0,
      width: 1000,
      x: 0,
      y: 0,
      top: 0,
      bottom: groupHeight,
      left: 0,
      right: 1000,
      toJSON: () => ({}),
    };
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('uses the measured group and acknowledges commands/container resize without publishing a preference', () => {
  // The former viewport-height conversion included the header and could persist a restoration as a drag.
  act(() => root.render(<Harness />));
  expect(size).toBe(40);
  expect(onHeightChange).not.toHaveBeenCalled();
  act(() => root.render(<Harness height={400} />));
  expect(size).toBe(50);
  groupHeight = 600;
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
  expect(size).toBeCloseTo((400 / 600) * 100);
  expect(onHeightChange).not.toHaveBeenCalled();
});

it('publishes pointer and keyboard geometry only during their actual input lifetime', () => {
  // A retained hidden panel or programmatic resize must not overwrite the user's last saved height.
  act(() => root.render(<Harness />));
  adapter.onDragging(true);
  act(() => panel.resize(55));
  expect(onHeightChange.mock.calls.at(-1)?.[0]).toBeCloseTo(440);
  adapter.onDragging(false);
  act(() => panel.resize(60));
  expect(onHeightChange).toHaveBeenCalledTimes(1);
  const handle = container.querySelector('button')!;
  act(() => {
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    fireEvent.keyUp(handle, { key: 'ArrowUp' });
  });
  expect(onHeightChange).toHaveBeenLastCalledWith(520);
  act(() => panel.resize(70));
  expect(onHeightChange).toHaveBeenCalledTimes(2);
  act(() => root.render(<Harness visible={false} />));
  adapter.onDragging(true);
  act(() => panel.resize(75));
  expect(onHeightChange).toHaveBeenCalledTimes(2);
  adapter.onDragging(false);
});
