import { describe, expect, it } from 'vitest';
import { areCanvasPositionsEqual, type CanvasPosition } from './canvasPositions';

describe('Canvas position value equality', () => {
  for (const [leftMap, rightMap] of [
    [false, false],
    [true, true],
    [false, true],
    [true, false],
  ]) {
    it(`compares identity and coordinates with Map representations ${leftMap}/${rightMap}`, () => {
      const left = { first: { x: -80, y: 0 }, second: { x: 0, y: 140 } };
      const compare = (right: Record<string, CanvasPosition>): boolean =>
        areCanvasPositionsEqual(
          leftMap ? new Map(Object.entries(left)) : left,
          rightMap ? new Map(Object.entries(right)) : right
        );
      expect(compare({ second: { x: 0, y: 140 }, first: { x: -80, y: 0 } })).toBe(true);
      expect(compare({ first: { x: -79, y: 0 }, second: left.second })).toBe(false);
      expect(compare({ first: left.first, second: { x: 0, y: 141 } })).toBe(false);
      expect(compare({ first: left.first, other: left.second })).toBe(false);
      expect(compare({ first: left.first })).toBe(false);
      expect(compare({ ...left, third: { x: 0, y: 0 } })).toBe(false);
    });
  }
  it('accepts empty and identical collections', () => {
    const positions = new Map([['source', { x: -1, y: 2 }]]);
    expect(areCanvasPositionsEqual(positions, positions)).toBe(true);
    expect(areCanvasPositionsEqual({}, new Map())).toBe(true);
  });
});
