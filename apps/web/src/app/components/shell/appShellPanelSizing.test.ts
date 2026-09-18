import { describe, expect, it } from 'vitest';

import { resolveBottomDrawerDefaultSize } from './appShellPanelSizing';

describe('application shell panel sizing', () => {
  it('honors the requested drawer height as an initial viewport percentage', () => {
    expect(resolveBottomDrawerDefaultSize(360, 660)).toBeCloseTo(54.55, 2);
  });

  it('keeps the drawer inside the resizable panel bounds', () => {
    expect(resolveBottomDrawerDefaultSize(20, 1_000)).toBe(12);
    expect(resolveBottomDrawerDefaultSize(2_000, 1_000)).toBe(90);
  });

  it('retains the shell default when no usable measurement exists', () => {
    expect(resolveBottomDrawerDefaultSize(0, 660)).toBe(22);
    expect(resolveBottomDrawerDefaultSize(360, 0)).toBe(22);
  });
});
