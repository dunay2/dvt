import { FileCode2, GitCompareArrows } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { buildShellNavigationModel } from './shellNavigationModel';

describe('buildShellNavigationModel', () => {
  it('maps runtime navigation views into primary shell items and appends shell footer items', () => {
    const model = buildShellNavigationModel([
      {
        pluginId: 'dbt',
        id: 'code.view',
        path: '/code',
        component: (() => null) as never,
        nav: {
          label: 'Code',
          icon: FileCode2,
          order: 30,
          level: 'core',
        },
      },
      {
        pluginId: 'dbt',
        id: 'diff.view',
        path: '/diff',
        component: (() => null) as never,
        nav: {
          label: { key: 'nav.diff', fallback: 'Diff' },
          icon: GitCompareArrows,
          order: 40,
          level: 'extended',
        },
      },
    ]);

    expect(model.primaryItems.map((item) => item.to)).toEqual(['/code', '/diff']);
    expect(model.primaryItems.map((item) => item.label)).toEqual(['Code', 'Diff']);
    expect(model.primaryItems.every((item) => item.source === 'runtime')).toBe(true);
    expect(model.footerItems.map((item) => item.to)).toEqual(['/plugins', '/admin']);
    expect(model.footerItems.every((item) => item.source === 'shell')).toBe(true);
  });
});
