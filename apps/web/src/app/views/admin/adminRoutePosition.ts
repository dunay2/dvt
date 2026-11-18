/** Own the security directory and its durable section URLs. An unknown section opens the directory. */
import { FileText, Server, Shield, Users } from 'lucide-react';

export const adminSectionNavigation = [
  { id: 'platform', icon: Server },
  { id: 'roles', icon: Users },
  { id: 'permissions', icon: Shield },
  { id: 'audit', icon: FileText },
] as const;

export type AdminTabId = (typeof adminSectionNavigation)[number]['id'];
type RouteLocation = Readonly<{ pathname: string; search: string; hash: string }>;

export function resolveActiveAdminTab(searchParams: URLSearchParams): AdminTabId | null {
  const value = searchParams.get('tab');
  return adminSectionNavigation.find((section) => section.id === value)?.id ?? null;
}

export function buildAdminSectionLocation(
  sectionId: AdminTabId,
  current: RouteLocation
): RouteLocation {
  const sameRoute = current.pathname.replace(/\/+$/u, '') === '/admin';
  const search = new URLSearchParams(sameRoute ? current.search : '');
  search.set('tab', sectionId);
  return {
    pathname: '/admin',
    search: `?${search.toString()}`,
    hash: sameRoute ? current.hash : '',
  };
}
