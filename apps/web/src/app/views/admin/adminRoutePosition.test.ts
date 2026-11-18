/** Prove one durable Admin URL contract for menu and passive route consumers. */
import { describe, expect, it } from 'vitest';
import { buildAdminSectionLocation, resolveActiveAdminTab } from './adminRoutePosition';

describe('Admin route position', () => {
  it.each(['platform', 'roles', 'permissions', 'audit'])(
    'restores the valid %s section from a direct URL',
    (id) => {
      expect(resolveActiveAdminTab(new URLSearchParams({ tab: id }))).toBe(id);
    }
  );
  it.each(['', 'tab=unknown'])(
    'returns the directory for an unrecognized selection (%s)',
    (search) => {
      expect(resolveActiveAdminTab(new URLSearchParams(search))).toBeNull();
    }
  );
  it('preserves unrelated search and hash only for the current Admin route', () => {
    expect(
      buildAdminSectionLocation('roles', {
        pathname: '/admin',
        search: '?filter=failed&tab=platform',
        hash: '#events',
      })
    ).toEqual({ pathname: '/admin', search: '?filter=failed&tab=roles', hash: '#events' });
    expect(
      buildAdminSectionLocation('audit', {
        pathname: '/canvas',
        search: '?canvasId=one',
        hash: '#node',
      })
    ).toEqual({ pathname: '/admin', search: '?tab=audit', hash: '' });
  });
});
