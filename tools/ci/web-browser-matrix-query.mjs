/** @ownedConcern Acquire the canonical browser plan in an isolated Node runtime without packages. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { registerHooks } from 'node:module';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fullWebBrowserMatrix } from './web-browser-matrix-preflight.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { selectWebCypressShard } from '../../apps/web/cypress.commands.ts';

const webRoot = new URL('../../apps/web/', import.meta.url).href;

export function resolveWebPlanSpecifier(specifier, context, nextResolve) {
  if (!context.parentURL?.startsWith(webRoot)) return nextResolve(specifier, context);
  assert.ok(
    specifier.startsWith('.') || specifier.startsWith('node:') || specifier.startsWith('file:'),
    'Browser preflight cannot depend on installed packages'
  );
  try {
    return nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith('.') || error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return nextResolve(specifier + '.ts', context);
  }
}

export function installWebPlanLoader() {
  registerHooks({
    resolve: resolveWebPlanSpecifier,
    load(url, context, nextLoad) {
      const localJson = url.startsWith(webRoot) && url.endsWith('.json');
      return nextLoad(
        url,
        localJson ? { ...context, importAttributes: { type: 'json' } } : context
      );
    },
  });
}

export function decodeCanonicalBrowserPlan(source) {
  const plan = JSON.parse(source);
  assert.ok(plan && typeof plan === 'object', 'Canonical browser plan must be an object');
  assert.ok(Array.isArray(plan.browserCommands), 'Canonical browser commands are required');
  return plan.browserCommands;
}

export function readCanonicalBrowserPlan(files = [], { env = process.env } = {}) {
  assert.ok(files.every((file) => typeof file === 'string' && !file.startsWith('--')));
  const queryEnv = { ...env };
  delete queryEnv.GITHUB_OUTPUT;
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      import.meta.url,
      fileURLToPath(
        new URL('../../apps/web/scripts/run-vitest-changed-suites.ts', import.meta.url)
      ),
      '--plan',
      '--phase=browser',
      ...files,
    ],
    { env: queryEnv, encoding: 'utf8', timeout: 4_000, maxBuffer: 16 * 1024 * 1024 }
  );
  assert.equal(
    result.status,
    0,
    result.stderr || String(result.error || 'Canonical browser planning failed')
  );
  return decodeCanonicalBrowserPlan(result.stdout);
}

export function projectWebBrowserMatrix(commands) {
  assert.ok(Array.isArray(commands), 'Browser commands must be an array');
  const seen = new Set();
  return commands.flatMap((command) => {
    const capability = command?.capability;
    assert.ok(['controlled', 'available', 'unavailable'].includes(capability));
    assert.equal(seen.has(capability), false, 'Canonical browser capability must occur once');
    seen.add(capability);
    assert.ok(Array.isArray(command.specPaths) && command.specPaths.length > 0);
    assert.ok(command.specPaths.every((path) => typeof path === 'string'));
    if (capability === 'unavailable') return [{ phase: 'browser', capability }];
    return Array.from({ length: 6 }, (_, index) => {
      const shard = index + 1;
      return selectWebCypressShard(command, { index: shard, count: 6 })
        ? [{ phase: 'browser', capability, shard }]
        : [];
    }).flat();
  });
}

export async function queryWebBrowserMatrix(
  files = [],
  { repoRoot = fileURLToPath(new URL('../../', import.meta.url)), env = process.env } = {}
) {
  const { isWebVitestImpactFrontier } = await import('../../apps/web/vitest/impact.ts');
  const { readChangedFiles } = await import('../../apps/web/scripts/changed-suite-git.ts');
  const changed = files.length > 0 ? files : readChangedFiles(repoRoot, { env });
  const current = changed.every(
    (file) => statSync(resolve(repoRoot, file), { throwIfNoEntry: false })?.isFile() === true
  );
  if (!isWebVitestImpactFrontier(changed) || !current) return fullWebBrowserMatrix();
  return projectWebBrowserMatrix(readCanonicalBrowserPlan(changed, { env }));
}

installWebPlanLoader();
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(await queryWebBrowserMatrix(process.argv.slice(2))) + '\n');
}
