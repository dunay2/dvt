import { describe, expect, it } from 'vitest';

import { resolveShellNavigationDisposition } from './shellNavigationDisposition';

describe('resolveShellNavigationDisposition', () => {
  it.each(['/canvas', '/runs', '/runs/run_123', '/templates', '/plugins', '/admin'])(
    'classifies product workbench route %s for command and context presentation',
    (pathname) => {
      expect(resolveShellNavigationDisposition(pathname)).toEqual({
        reason: 'workbench_route',
      });
    }
  );

  it('classifies uncataloged global shell routes without adding a navigation alternative', () => {
    expect(resolveShellNavigationDisposition('/legacy')).toEqual({
      reason: 'global_route',
    });
  });
});
