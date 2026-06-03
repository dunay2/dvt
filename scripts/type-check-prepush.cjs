#!/usr/bin/env node
/** Owned concern: select the pre-push type-check scope from the local changed-file set. */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { listLocalChangedFiles } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

async function loadScopeClassifier() {
  return import('../tools/ci/prepush-typecheck-scope.mjs');
}

async function main() {
  const changedFiles = listLocalChangedFiles({ repoRootPath: repoRoot });

  if (changedFiles.length === 0) {
    console.log('[type-check-prepush] No changed files detected. Skipping type-check.');
    return 0;
  }

  const { classifyPrepushTypecheck } = await loadScopeClassifier();
  const plan = classifyPrepushTypecheck(changedFiles);

  if (plan.mode === 'skip') {
    console.log(`[type-check-prepush] ${plan.reason}.`);
    return 0;
  }

  console.log(`[type-check-prepush] Selected ${plan.run.label} (${plan.reason}).`);
  console.log('[type-check-prepush] Relevant files:');
  for (const filePath of plan.relevantFiles) {
    console.log(filePath);
  }

  if (plan.affectedPackages.length > 0) {
    console.log('[type-check-prepush] Affected packages:');
    for (const packageName of plan.affectedPackages) {
      console.log(packageName);
    }
  }

  const result = spawnSync(plan.run.command, plan.run.args, {
    shell: true,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status || 0;
}

main()
  .then((status) => {
    process.exit(status);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
