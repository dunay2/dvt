import { describe, expect, it } from 'vitest';

import { resolveShellNavigationDisposition } from './shellNavigationDisposition';

describe('resolveShellNavigationDisposition', () => {
  it.each(['/canvas', '/runs', '/runs/run_123', '/templates', '/plugins', '/admin'])(
    'hides the permanent rail on product workbench route %s and moves global links to the menu',
    (pathname) => {
      expect(resolveShellNavigationDisposition(pathname)).toEqual({
        railMode: 'hidden',
        footerMode: 'menu',
        reason: 'workbench_route',
      });
    }
  );

  it('keeps the permanent rail pinned only on uncataloged global shell routes', () => {
    expect(resolveShellNavigationDisposition('/legacy')).toEqual({
      railMode: 'visible',
      footerMode: 'pinned',
      reason: 'global_route',
    });
  });
});
