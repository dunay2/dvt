/** Owned concern: normalize shell navigation views into render-ready shell rail items. */
import { Shield, Puzzle } from 'lucide-react';

import { resolveString } from '../plugins/contracts/PluginManifest';
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
  navigationViews: readonly ShellNavigationViewContribution[]
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
      label: resolveString(view.placement.label),
      level: view.placement.level,
      source: 'runtime',
    })),
    footerItems: SHELL_NAV,
  };
}
