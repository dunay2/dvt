/** Own the Admin section definitions and durable URL position for route and shell consumers. */
import { FileText, Server, Shield, Users } from 'lucide-react';
import type { ShellRouteSectionNavigation } from '../../shell/shellNavigationModel';
import { adminViewCopy as copy } from './copy';

const ADMIN_TAB_IDS = ['platform', 'roles', 'permissions', 'audit'] as const;
export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];
type RouteLocation = Readonly<{ pathname: string; search: string; hash: string }>;

function isAdminTabId(value: string | null): value is AdminTabId {
  return value !== null && ADMIN_TAB_IDS.includes(value as AdminTabId);
}

export function resolveActiveAdminTab(
  searchParams: URLSearchParams,
  fallback: AdminTabId = 'platform'
): AdminTabId {
  const value = searchParams.get('tab');
  return isAdminTabId(value) ? value : fallback;
}

export function buildAdminSectionLocation(
  sectionId: string,
  current: RouteLocation
): RouteLocation {
  const sameRoute = current.pathname.replace(/\/+$/u, '') === '/admin';
  const search = new URLSearchParams(sameRoute ? current.search : '');
  search.set('tab', isAdminTabId(sectionId) ? sectionId : 'platform');
  return {
    pathname: '/admin',
    search: `?${search.toString()}`,
    hash: sameRoute ? current.hash : '',
  };
}

export const adminRouteHeading = { title: copy.title, icon: Shield } as const;
export const adminSectionNavigation: ShellRouteSectionNavigation = {
  items: [
    { id: 'platform', label: copy.tabs.platform, icon: Server },
    { id: 'roles', label: copy.tabs.roles, icon: Users },
    { id: 'permissions', label: copy.tabs.permissions, icon: Shield },
    { id: 'audit', label: copy.tabs.audit, icon: FileText },
  ],
  activeId: resolveActiveAdminTab,
  locationFor: buildAdminSectionLocation,
};
