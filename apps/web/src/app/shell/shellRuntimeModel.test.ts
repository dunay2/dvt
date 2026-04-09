import { describe, expect, it } from 'vitest';

import { buildShellRuntimeState } from './shellRuntimeModel';

describe('buildShellRuntimeState', () => {
  it('filters unavailable backend plugins from runtime navigation and plugin ids', () => {
    const state = buildShellRuntimeState({
      apiVersion: '0.1.0',
      minFrontendVersion: '0.1.0',
      plugins: {
        cost: {
          available: false,
          reason: 'Backend cost capability is not implemented yet',
        },
      },
    });

    expect(state.defaultCoreViewPath).toBe('/canvas');
    expect(state.enabledPluginIds.has('cost')).toBe(false);
    expect(state.registeredPluginIds.has('cost')).toBe(false);
    expect(state.navigationViews.some((view) => view.path === '/cost')).toBe(false);
  });

  it('keeps plugin runtime views when backend capability data is absent', () => {
    const state = buildShellRuntimeState(undefined);

    expect(state.enabledPluginIds.has('cost')).toBe(true);
    expect(state.registeredPluginIds.has('cost')).toBe(true);
    expect(state.navigationViews.some((view) => view.path === '/canvas')).toBe(true);
  });
});
