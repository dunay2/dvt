import { FileCode2, GitCompareArrows } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { createPublishedRouteBootstrapHandle } from '../bootstrap/routeBootstrapContract';
import { buildShellNavigationModel, resolveShellRouteHeading } from './shellNavigationModel';

describe('buildShellNavigationModel', () => {
  it.each(['en', 'es-ES'])('projects only opted-in localized runtime headings (%s)', (locale) => {
    // Runs previously spent a second title band while the shared shell row stayed empty.
    const view = {
      pluginId: 'monitoring',
      id: 'monitoring.runs',
      path: '/runs',
      component: (() => null) as never,
      handle: {
        routeBootstrap: createPublishedRouteBootstrapHandle({ pendingDetail: 'Preparing runs' }),
      },
      placement: {
        kind: 'shell-nav' as const,
        label: { key: 'navigation.runs', fallback: 'Runs', translations: { es: 'Ejecuciones' } },
        icon: FileCode2,
        order: 20,
        level: 'core' as const,
        showRouteHeading: true,
      },
    };
    const model = buildShellNavigationModel([view], locale);
    const expected = locale.startsWith('es') ? 'Ejecuciones' : 'Runs';
    expect(resolveShellRouteHeading(model, '/runs')).toEqual({ title: expected, icon: FileCode2 });
    expect(resolveShellRouteHeading(model, '/runs/run_1')?.title).toBe(expected);
    expect(resolveShellRouteHeading(model, '/runs-extra')).toBeNull();
    expect(
      resolveShellRouteHeading(
        buildShellNavigationModel(
          [{ ...view, placement: { ...view.placement, showRouteHeading: false } }],
          locale
        ),
        '/runs'
      )
    ).toBeNull();
  });
  it('projects opted-in headings and section destinations without another route-title state', () => {
    const model = buildShellNavigationModel([]);
    expect(resolveShellRouteHeading(model, '/admin')?.title).toBe('Admin & RBAC');
    expect(resolveShellRouteHeading(model, '/admin/')).not.toBeNull();
    expect(resolveShellRouteHeading(model, '/administrator')).toBeNull();
    expect(resolveShellRouteHeading(model, '/canvas')).toBeNull();
    expect(
      model.footerItems.find((item) => item.to === '/admin')?.sections?.items.map((item) => item.id)
    ).toEqual(['platform', 'roles', 'permissions', 'audit']);
    expect(model.footerItems.find((item) => item.to === '/plugins')?.sections).toBeUndefined();
  });
  it('maps runtime navigation views into primary shell items and appends shell footer items', () => {
    const model = buildShellNavigationModel([
      {
        pluginId: 'dbt',
        id: 'code.view',
        path: '/code',
        component: (() => null) as never,
        handle: {
          routeBootstrap: createPublishedRouteBootstrapHandle({
            pendingDetail: 'Preparing code route',
          }),
        },
        placement: {
          kind: 'shell-nav',
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
        handle: {
          routeBootstrap: createPublishedRouteBootstrapHandle({
            pendingDetail: 'Preparing diff route',
          }),
        },
        placement: {
          kind: 'shell-nav',
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

  it('resolves plugin and shell navigation labels with the selected application language', () => {
    const model = buildShellNavigationModel(
      [
        {
          pluginId: 'monitoring',
          id: 'monitoring.runs',
          path: '/runs',
          component: (() => null) as never,
          handle: {
            routeBootstrap: createPublishedRouteBootstrapHandle({
              pendingDetail: 'Preparing runs route',
            }),
          },
          placement: {
            kind: 'shell-nav',
            label: {
              key: 'navigation.runs',
              fallback: 'Runs',
              translations: { es: 'Ejecuciones' },
            },
            icon: GitCompareArrows,
            order: 20,
            level: 'core',
          },
        },
      ],
      'es-ES'
    );

    expect(model.primaryItems.map((item) => item.label)).toEqual(['Ejecuciones']);
    expect(model.footerItems.map((item) => item.label)).toEqual(['Plugins', 'Administración']);
  });

  it('refuses Canvas workbench tab placements at the shell navigation boundary', () => {
    expect(() =>
      buildShellNavigationModel([
        {
          pluginId: 'dbt',
          id: 'code.view',
          component: (() => null) as never,
          placement: {
            kind: 'workbench-tab',
            workbench: 'canvas',
            tabId: 'code',
            label: 'Code',
            icon: FileCode2,
            order: 20,
            scope: 'selection',
          },
        },
      ] as never)
    ).toThrow(/shell navigation/i);
  });
});
