/** Owned concern: normalize shell navigation views into render-ready shell rail items. */
import { Shield, Puzzle } from 'lucide-react';

import { resolveString, type LocalizableString } from '../plugins/contracts/PluginManifest';
import type { ShellNavigationViewContribution } from '../plugins/registry';

export type ShellNavigationItem = {
  readonly to: string;
  readonly icon: ShellNavigationViewContribution['placement']['icon'];
  readonly label: string;
  readonly level: ShellNavigationViewContribution['placement']['level'];
  readonly source: 'runtime' | 'shell';
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
  },
] as const;

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
    primaryItems: navigationViews.map((view) => ({
      to: view.path,
      icon: view.placement.icon,
      label: resolveString(view.placement.label, locale),
      level: view.placement.level,
      source: 'runtime',
    })),
    footerItems: SHELL_NAV.map((item) => ({ ...item, label: resolveString(item.label, locale) })),
  };
}
