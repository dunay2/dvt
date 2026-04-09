/**
 * Guard for pretest scripts: exits 0 when DVT_CI is set (skipping the
 * subsequent || build chain), exits 1 otherwise so the local build runs.
 *
 * Usage in package.json:
 *   "pretest": "node scripts/skip-pretest-if-ci.cjs || pnpm --filter ..."
 *
 * In CI workflows, set DVT_CI=1 after running `pnpm -r build` once to
 * avoid redundant per-package dependency rebuilds.
 */
'use strict';
process.exit(process.env.DVT_CI === '1' ? 0 : 1);
