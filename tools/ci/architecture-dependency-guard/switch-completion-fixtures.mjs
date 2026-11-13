/** Owned concern: Exact statement inputs for directed completion across switches. */

export const labelledBreakStatements = [
  '  outer: {',
  "    switch ('on') { case 'on': break outer; }",
  '    if (!env.OBS_ENABLED) return createNoopObservability();',
  '    return new OtelObservability({});',
  '  }',
  '  return null;',
];

export const labelledFinallyBreakStatements = [
  '  outer: {',
  "    switch ('on') { case 'on': try { break outer; } finally { cleanup(); } }",
  '    if (!env.OBS_ENABLED) return createNoopObservability();',
  '    return new OtelObservability({});',
  '  }',
  '  return null;',
];

export const loopContinueStatements = [
  '  for (;;) {',
  "    switch ('on') { case 'on': continue; }",
  '    if (!env.OBS_ENABLED) return createNoopObservability();',
  '    return new OtelObservability({});',
  '  }',
];

export const labelledContinueStatements = [
  '  outer: for (;;) {',
  "    switch ('on') { case 'on': continue outer; }",
  '    if (!env.OBS_ENABLED) return createNoopObservability();',
  '    return new OtelObservability({});',
  '  }',
];

export const selectedBreakStatements = [
  "  switch ('on') { case 'on': break; }",
  '  if (!env.OBS_ENABLED) return createNoopObservability();',
  '  return new OtelObservability({});',
];

export const conditionalBreakStatements = [
  '  outer: {',
  "    switch ('on') { case 'on': if (env.skip) break outer; }",
  '    if (!env.OBS_ENABLED) return createNoopObservability();',
  '    return new OtelObservability({});',
  '  }',
];

export const nestedLoopSwitchStatements = [
  "  switch ('on') {",
  "    case 'on':",
  '      while (env.pending) { break; }',
  "      switch ('inner') { case 'inner': break; }",
  '      break;',
  '  }',
  '  if (!env.OBS_ENABLED) return createNoopObservability();',
  '  return new OtelObservability({});',
];
