#!/usr/bin/env node
const { execSync, spawnSync } = require('node:child_process');

function parseChangedFiles(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitExec(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function hasUpstream() {
  try {
    execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function hasRef(ref) {
  try {
    execSync(`git rev-parse --verify ${ref}`, {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function resolveDiffCommand() {
  if (hasRef('origin/main')) return 'git diff --name-only --diff-filter=ACMR origin/main...HEAD';
  if (hasUpstream()) return 'git diff --name-only --diff-filter=ACMR @{u}...HEAD';
  return 'git diff --name-only --diff-filter=ACMR HEAD~1..HEAD';
}

function listChangedFiles() {
  try {
    return parseChangedFiles(gitExec(resolveDiffCommand()));
  } catch {
    return [];
  }
}

async function loadScopeClassifier() {
  return import('../tools/ci/prepush-typecheck-scope.mjs');
}

async function main() {
  const changedFiles = listChangedFiles();

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
