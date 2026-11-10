/** Owned concern: normalize shell navigation views into render-ready shell rail items. */
import { Shield, Puzzle } from 'lucide-react';

import { resolveString, type LocalizableString } from '../plugins/contracts/PluginManifest';
import type { ShellNavigationViewContribution } from '../plugins/registry';
import { adminRouteHeading, adminSectionNavigation } from '../views/admin/adminRoutePosition';

export type ShellRouteHeading = Readonly<{
  title: string;
  icon: ShellNavigationViewContribution['placement']['icon'];
}>;
export type ShellRouteSectionNavigation = Readonly<{
  items: readonly Readonly<{ id: string; label: string; icon: ShellRouteHeading['icon'] }>[];
  activeId(search: URLSearchParams): string;
  locationFor(
    id: string,
    current: Readonly<{ pathname: string; search: string; hash: string }>
  ): Readonly<{ pathname: string; search: string; hash: string }>;
}>;

export type ShellNavigationItem = {
  readonly to: string;
  readonly icon: ShellNavigationViewContribution['placement']['icon'];
  readonly label: string;
  readonly level: ShellNavigationViewContribution['placement']['level'];
  readonly source: 'runtime' | 'shell';
  readonly heading?: ShellRouteHeading;
  readonly sections?: ShellRouteSectionNavigation;
};

export type ShellNavigationModel = {
  readonly primaryItems: readonly ShellNavigationItem[];
  readonly footerItems: readonly ShellNavigationItem[];
};

const SHELL_NAV: readonly Readonly<
  Omit<ShellNavigationItem, 'label'> & { label: LocalizableString }
>[] = [
  {
    to: '/plugins',
    icon: Puzzle,
    label: { key: 'navigation.plugins', fallback: 'Plugins', translations: { es: 'Plugins' } },
    level: 'extended',
    source: 'shell',
  },
  {
    to: '/admin',
    icon: Shield,
    label: {
      key: 'navigation.admin',
      fallback: 'Admin',
      translations: { es: 'Administración' },
    },
    level: 'admin',
    source: 'shell',
    heading: adminRouteHeading,
    sections: adminSectionNavigation,
  },
] as const;

/** An opted-in route uses the existing navigation identity; no title is published into state. */
export function resolveShellRouteHeading(
  model: ShellNavigationModel,
  pathname: string
): ShellRouteHeading | null {
  return (
    [...model.primaryItems, ...model.footerItems].find(
      (item) => item.heading != null && (pathname === item.to || pathname.startsWith(`${item.to}/`))
    )?.heading ?? null
  );
}

export function buildShellNavigationModel(
  navigationViews: readonly ShellNavigationViewContribution[],
  locale = 'en'
): ShellNavigationModel {
  for (const view of navigationViews) {
    if (view.placement.kind !== 'shell-nav') {
      throw new Error(`View contribution ${view.id} is not a shell navigation placement.`);
    }
  }

  return {
    primaryItems: navigationViews.map<ShellNavigationItem>((view) => {
      const label = resolveString(view.placement.label, locale);
      return {
        to: view.path,
        icon: view.placement.icon,
        label,
        level: view.placement.level,
        source: 'runtime',
        ...(view.placement.showRouteHeading
          ? { heading: { title: label, icon: view.placement.icon } }
          : {}),
      };
    }),
    footerItems: SHELL_NAV.map((item) => ({ ...item, label: resolveString(item.label, locale) })),
  };
}
