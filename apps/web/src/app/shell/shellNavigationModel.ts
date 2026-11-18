/** Owned concern: normalize shell navigation views into render-ready shell rail items. */
import { Shield, Puzzle } from 'lucide-react';

import { resolveString, type LocalizableString } from '../plugins/contracts/PluginManifest';
import type { ShellNavigationViewContribution } from '../plugins/registry';
import { adminViewCopy } from '../views/admin/copy';

export type ShellRouteHeading = Readonly<{
  title: string;
  icon: ShellNavigationViewContribution['placement']['icon'];
}>;

export type ShellNavigationItem = {
  readonly to: string;
  readonly icon: ShellNavigationViewContribution['placement']['icon'];
  readonly label: string;
  readonly level: ShellNavigationViewContribution['placement']['level'];
  readonly source: 'runtime' | 'shell';
  readonly heading?: ShellRouteHeading;
};

export type ShellNavigationModel = {
  readonly primaryItems: readonly ShellNavigationItem[];
  readonly footerItems: readonly ShellNavigationItem[];
};

const SHELL_NAV: readonly Readonly<
  Omit<ShellNavigationItem, 'label' | 'heading'> & {
    label: LocalizableString;
    headingTitle?: LocalizableString;
  }
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
    headingTitle: adminViewCopy.title,
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
    footerItems: SHELL_NAV.map(({ headingTitle, ...item }) => ({
      ...item,
      label: resolveString(item.label, locale),
      ...(headingTitle == null
        ? {}
        : { heading: { title: resolveString(headingTitle, locale), icon: item.icon } }),
    })),
  };
}
