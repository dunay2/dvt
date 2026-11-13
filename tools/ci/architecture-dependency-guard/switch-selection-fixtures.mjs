/** Owned concern: Exact source inputs for switch selection and fallthrough profile proofs. */

export const inlineInput = {
  modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function buildObservability(env) {',
        "  switch ('off') {",
        "    case 'on':",
        '      if (!env.OBS_ENABLED) return createNoopObservability();',
        '      return new OtelObservability({});',
        '    default:',
        '      return null;',
        '  }',
        '}',
        'buildObservability(env);',
      ].join('\n'),
    ],
  ]),
};

export const callbackInput = {
  modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function invoke(callback) {',
        "  switch ('off') {",
        "    case 'on': return callback(env);",
        '    default: return null;',
        '  }',
        '}',
        'function buildObservability(env) { if (!env.OBS_ENABLED) return createNoopObservability(); return new OtelObservability({}); }',
        'invoke(buildObservability);',
      ].join('\n'),
    ],
  ]),
};

export const factoryInput = {
  modules: [
    {
      source: 'apps/api/src/app.ts',
      dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
    },
  ],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function createTemporalAdapterFactory() {',
        '  return {',
        '    async build(context) {',
        '      if (!context.env.TEMPORAL_ADDRESS) return null;',
        "      return import('@dvt/adapter-temporal');",
        '    },',
        '  };',
        '}',
        'async function consume(factories) {',
        "  switch ('off') {",
        "    case 'on': for (const factory of factories) await factory.build(context); break;",
        '    default: return null;',
        '  }',
        '}',
        'consume([createTemporalAdapterFactory()]);',
      ].join('\n'),
    ],
  ]),
};

export const breakStopsFallthroughInput = {
  modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function buildObservability(env) {',
        "  switch ('on') {",
        "    case 'on': break;",
        "    case 'dead':",
        '      if (!env.OBS_ENABLED) return createNoopObservability();',
        '      return new OtelObservability({});',
        '    default: return null;',
        '  }',
        '  return null;',
        '}',
        'buildObservability(env);',
      ].join('\n'),
    ],
  ]),
};

export const nestedBreakInput = {
  modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function buildObservability(env) {',
        "  switch ('on') {",
        "    case 'on': {",
        '      break;',
        '      if (!env.OBS_ENABLED) return createNoopObservability();',
        '      return new OtelObservability({});',
        '    }',
        '    default: return null;',
        '  }',
        '  return null;',
        '}',
        'buildObservability(env);',
      ].join('\n'),
    ],
  ]),
};

export const nestedContinueInput = {
  modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function buildObservability(env) {',
        '  for (;;) {',
        "    switch ('on') {",
        "      case 'on': {",
        '        continue;',
        '        if (!env.OBS_ENABLED) return createNoopObservability();',
        '        return new OtelObservability({});',
        '      }',
        '      default: return null;',
        '    }',
        '  }',
        '}',
        'buildObservability(env);',
      ].join('\n'),
    ],
  ]),
};

export const selectedFallthroughInput = {
  modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function buildObservability(env) {',
        "  switch ('on') {",
        "    case 'on':",
        "    case 'alias':",
        '      if (!env.OBS_ENABLED) return createNoopObservability();',
        '      return new OtelObservability({});',
        '    default:',
        '      return null;',
        '  }',
        '}',
        'buildObservability(env);',
      ].join('\n'),
    ],
  ]),
};

export const selectedDefaultInput = {
  modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
  productionSources: new Set(['apps/api/src/app.ts']),
  sourceContents: new Map([
    [
      'apps/api/src/app.ts',
      [
        'function buildObservability(env) {',
        "  switch ('off') {",
        "    case 'on': return null;",
        '    default:',
        '      if (!env.OBS_ENABLED) return createNoopObservability();',
        '      return new OtelObservability({});',
        '  }',
        '}',
        'buildObservability(env);',
      ].join('\n'),
    ],
  ]),
};
