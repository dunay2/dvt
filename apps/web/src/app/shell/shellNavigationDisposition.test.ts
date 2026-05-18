import { describe, expect, it } from 'vitest';

import { resolveShellNavigationDisposition } from './shellNavigationDisposition';

describe('resolveShellNavigationDisposition', () => {
  it('hides the permanent rail on Canvas workbench routes and moves global links to the menu', () => {
    expect(resolveShellNavigationDisposition('/canvas')).toEqual({
      railMode: 'hidden',
      footerMode: 'menu',
      reason: 'workbench_route',
    });
    expect(resolveShellNavigationDisposition('/canvas/code')).toEqual({
      railMode: 'hidden',
      footerMode: 'menu',
      reason: 'workbench_route',
    });
  });

  it('keeps the permanent rail pinned on global shell routes', () => {
    expect(resolveShellNavigationDisposition('/runs')).toEqual({
      railMode: 'visible',
      footerMode: 'pinned',
      reason: 'global_route',
    });
    expect(resolveShellNavigationDisposition('/plugins')).toEqual({
      railMode: 'visible',
      footerMode: 'pinned',
      reason: 'global_route',
    });
  });
});
