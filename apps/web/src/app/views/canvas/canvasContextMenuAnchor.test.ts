// @vitest-environment jsdom
/**
 * Owned concern: prove the menu anchor adapter mutates only its two live coordinates.
 * @baseline GH-3629: static menu appearance belongs to the stylesheet.
 * @decision Assert geometry updates and empty-ref handling on a real span.
 * @consequence Static positioning, dimensions and interaction cannot migrate back into TypeScript.
 * @version 1.0.0
 */
import { describe, expect, it } from 'vitest';
import { positionCanvasContextMenuAnchor } from './canvasContextMenuAnchor';

describe('Canvas context menu anchor geometry', () => {
  it.each([
    [{ x: 320, y: 260 }, '320px', '260px'],
    [{ x: 0, y: 0 }, '0px', '0px'],
    [{ x: -8.5, y: 12.25 }, '-8.5px', '12.25px'],
    [null, '0px', '0px'],
  ] as const)('writes only x/y custom properties for %j', (position, x, y) => {
    const anchor = document.createElement('span');
    positionCanvasContextMenuAnchor(anchor, position);
    expect(anchor.style.getPropertyValue('--canvas-context-menu-anchor-x')).toBe(x);
    expect(anchor.style.getPropertyValue('--canvas-context-menu-anchor-y')).toBe(y);
    expect(Array.from(anchor.style)).toEqual([
      '--canvas-context-menu-anchor-x',
      '--canvas-context-menu-anchor-y',
    ]);
  });

  it('updates coordinates and resets a closed model without replacing unrelated properties', () => {
    const anchor = document.createElement('span');
    anchor.style.setProperty('--unrelated-token', 'preserved');
    positionCanvasContextMenuAnchor(anchor, { x: 100, y: 200 });
    positionCanvasContextMenuAnchor(anchor, { x: 300, y: 400 });
    expect(anchor.style.getPropertyValue('--canvas-context-menu-anchor-x')).toBe('300px');
    expect(anchor.style.getPropertyValue('--canvas-context-menu-anchor-y')).toBe('400px');
    positionCanvasContextMenuAnchor(anchor, null);
    expect(anchor.style.getPropertyValue('--canvas-context-menu-anchor-x')).toBe('0px');
    expect(anchor.style.getPropertyValue('--canvas-context-menu-anchor-y')).toBe('0px');
    expect(anchor.style.getPropertyValue('--unrelated-token')).toBe('preserved');
  });

  it('accepts the null ref delivered on unmount', () => {
    expect(() => positionCanvasContextMenuAnchor(null, { x: 100, y: 200 })).not.toThrow();
  });
});
