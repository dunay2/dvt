import { Shield, Puzzle } from 'lucide-react';

import { resolveString } from '../plugins/contracts/PluginManifest';
import type { ViewContribution } from '../plugins/contracts/PluginManifest';

export type ShellNavigationItem = {
  readonly to: string;
  readonly icon: NonNullable<ViewContribution['nav']>['icon'];
  readonly label: string;
  readonly level: 'core' | 'extended' | 'admin';
  readonly source: 'runtime' | 'shell';
};

export type ShellNavigationModel = {
  readonly primaryItems: readonly ShellNavigationItem[];
  readonly footerItems: readonly ShellNavigationItem[];
};

const SHELL_NAV: readonly ShellNavigationItem[] = [
  {
    to: '/plugins',
    icon: Puzzle,
    label: 'Plugins',
    level: 'extended',
    source: 'shell',
  },
  {
    to: '/admin',
    icon: Shield,
    label: 'Admin',
    level: 'admin',
    source: 'shell',
  },
] as const;

export function buildShellNavigationModel(
  navigationViews: Array<ViewContribution & { nav: NonNullable<ViewContribution['nav']> }>
): ShellNavigationModel {
  return {
    primaryItems: navigationViews.map((view) => ({
      to: view.path,
      icon: view.nav.icon,
      label: resolveString(view.nav.label),
      level: view.nav.level,
      source: 'runtime',
    })),
    footerItems: SHELL_NAV,
  };
}
