import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(architectureDir);
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const registry = JSON.parse(readFileSync(join(contextsDir, 'registry.json'), 'utf8'));
const contextIds = registry.contexts ?? [];
const baselineSha = process.env.DVT_ARCH_BASELINE_SHA || registry.baselineSha;

if (!baselineSha) throw new Error('DVT_ARCH_BASELINE_SHA is required for coverage verification');
if (!contextIds.length) throw new Error('Context registry is empty');

const git = (args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trimEnd();

git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const registered = contextIds.map((contextId) => {
  const configPath = join(contextsDir, `${contextId}-source-baseline.json`);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!config.scope) throw new Error(`${contextId} has no scope`);
  return { contextId, scope: config.scope, modelId: config.modelId ?? null };
});

const duplicateScopes = [...groupBy(registered, (item) => item.scope).entries()]
  .filter(([, items]) => items.length > 1)
  .map(([scope, items]) => ({ scope, contexts: items.map((item) => item.contextId) }));

const expectedScopes = [
  ...workspaceChildren('apps'),
  ...workspaceChildren('packages/@dvt'),
].sort();
const registeredScopes = registered.map((item) => item.scope).sort();
const registeredSet = new Set(registeredScopes);
const expectedSet = new Set(expectedScopes);
const unregisteredScopes = expectedScopes.filter((scope) => !registeredSet.has(scope));
const staleRegisteredScopes = registeredScopes.filter((scope) => !expectedSet.has(scope));

const inventories = contextIds.map((contextId) => {
  const path = join(generatedDir, `${contextId}-inventory.json`);
  const inventory = JSON.parse(readFileSync(path, 'utf8'));
  return {
    contextId,
    scope: inventory.scope,
    trackedFiles: inventory.counts?.trackedFiles ?? 0,
    sourceFiles: inventory.counts?.sourceFiles ?? 0,
    testFiles: inventory.counts?.testFiles ?? 0,
    inventorySha256: inventory.inventorySha256,
  };
});

const evidenceBase = {
  schemaVersion: 1,
  generatedFrom: 'git-workspace-tree+context-registry',
  baselineSha,
  expectedWorkspaceCount: expectedScopes.length,
  registeredContextCount: registered.length,
  expectedScopes,
  registered,
  unregisteredScopes,
  staleRegisteredScopes,
  duplicateScopes,
  totals: {
    trackedFiles: inventories.reduce((sum, item) => sum + item.trackedFiles, 0),
    sourceFiles: inventories.reduce((sum, item) => sum + item.sourceFiles, 0),
    testFiles: inventories.reduce((sum, item) => sum + item.testFiles, 0),
  },
  inventories,
};
const canonical = JSON.stringify(evidenceBase, null, 2) + '\n';
const evidence = {
  ...evidenceBase,
  evidenceSha256: createHash('sha256').update(canonical).digest('hex'),
};

mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, 'context-coverage.json'), JSON.stringify(evidence, null, 2) + '\n');

if (duplicateScopes.length || unregisteredScopes.length || staleRegisteredScopes.length) {
  const problems = [];
  if (duplicateScopes.length) problems.push(`duplicate scopes: ${duplicateScopes.map((item) => item.scope).join(', ')}`);
  if (unregisteredScopes.length) problems.push(`unregistered workspaces: ${unregisteredScopes.join(', ')}`);
  if (staleRegisteredScopes.length) problems.push(`stale registered scopes: ${staleRegisteredScopes.join(', ')}`);
  throw new Error(`Source-first context coverage failed — ${problems.join('; ')}`);
}

console.log(
  `Coverage OK: ${registered.length}/${expectedScopes.length} app/@dvt workspaces registered; ` +
    `${evidence.totals.trackedFiles} tracked files represented @ ${baselineSha.slice(0, 8)}.`,
);

function workspaceChildren(treePath) {
  let entries;
  try {
    entries = git(['ls-tree', '--name-only', `${baselineSha}:${treePath}`])
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }

  const scopes = [];
  for (const name of entries) {
    const scope = `${treePath}/${name}`;
    try {
      git(['cat-file', '-e', `${baselineSha}:${scope}/package.json`]);
      scopes.push(scope);
    } catch {
      // Not a workspace/app package; ignore it for this coverage contract.
    }
  }
  return scopes;
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const values = map.get(key) ?? [];
    values.push(item);
    map.set(key, values);
  }
  return map;
}
