#!/usr/bin/env node

const path = require('node:path');
const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runPnpm(args, options = {}) {
  const result = spawnSync('pnpm', args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    encoding: options.encoding ?? 'utf8',
    shell: process.platform === 'win32',
    stdio: options.stdio ?? 'pipe',
  });

  if (result.error) {
    fail(`PNPM_SPAWN_FAILED: ${result.error.message}`);
  }

  if ((result.status ?? 1) !== 0) {
    if (typeof result.stdout === 'string' && result.stdout.trim().length > 0) {
      process.stdout.write(result.stdout);
    }
    if (typeof result.stderr === 'string' && result.stderr.trim().length > 0) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return result;
}

function parseArgs(argv) {
  const [packageName, ...rest] = argv;
  if (!packageName) {
    fail(
      'USAGE: node scripts/build-workspace-runtime-deps.cjs <workspace-package> [--include-package <workspace-package> ...] [--build-self]'
    );
  }

  const includePackages = [];
  let buildSelf = false;

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];
    if (current === '--build-self') {
      buildSelf = true;
      continue;
    }

    if (current !== '--include-package') {
      fail(`UNKNOWN_ARGUMENT: ${current}`);
    }

    const includePackage = rest[index + 1];
    if (!includePackage) {
      fail('MISSING_INCLUDE_PACKAGE_NAME');
    }

    includePackages.push(includePackage);
    index += 1;
  }

  for (const name of [packageName, ...includePackages]) {
    if (!packageNamePattern.test(name)) {
      fail(`INVALID_WORKSPACE_PACKAGE_NAME: ${name}`);
    }
  }

  return { packageName, includePackages, buildSelf };
}

function isWorkspacePackage(entry) {
  return (
    entry &&
    typeof entry.name === 'string' &&
    typeof entry.path === 'string' &&
    (path.resolve(entry.path) === repoRoot ||
      path.resolve(entry.path).startsWith(`${repoRoot}${path.sep}`))
  );
}

function readRuntimeClosure(packageName, buildSelf = false) {
  const result = runPnpm(
    ['list', '--filter-prod', `${packageName}...`, '--json', '--depth', '-1'],
    { encoding: 'utf8' }
  );

  let packages;
  try {
    packages = JSON.parse(result.stdout);
  } catch (error) {
    fail(`INVALID_PNPM_JSON: ${error.message}`);
  }

  if (!Array.isArray(packages)) {
    fail('INVALID_PNPM_PACKAGE_LIST');
  }

  const closure = new Set();
  for (const entry of packages) {
    if (!isWorkspacePackage(entry)) {
      continue;
    }

    if (!packageNamePattern.test(entry.name)) {
      fail(`INVALID_WORKSPACE_PACKAGE_NAME: ${entry.name}`);
    }
    if (buildSelf && entry.name === packageName) {
      const manifest = JSON.parse(readFileSync(path.join(entry.path, 'package.json'), 'utf8'));
      if (typeof manifest.scripts?.build !== 'string' || !manifest.scripts.build.trim()) {
        fail(`WORKSPACE_BUILD_SCRIPT_MISSING: ${entry.name}`);
      }
    }
    closure.add(entry.name);
  }

  if (!closure.has(packageName)) {
    fail(`WORKSPACE_PACKAGE_NOT_FOUND: ${packageName}`);
  }

  return closure;
}

function buildPackages(packageNames) {
  if (packageNames.length === 0) {
    return;
  }

  // pnpm owns the production closure; Turbo owns ordering, hashes and outputs.
  // --only preserves that exact closure instead of adding devDependencies.
  const args = ['exec', 'turbo', 'run', 'build', '--only', '--concurrency=4'];
  for (const packageName of packageNames) {
    args.push(`--filter=${packageName}`);
  }

  runPnpm(args, {
    env: { ...process.env, DVT_CI: '1' },
    stdio: 'inherit',
  });
}

function main() {
  const { packageName, includePackages, buildSelf } = parseArgs(process.argv.slice(2));
  const selectedPackages = readRuntimeClosure(packageName, buildSelf);
  if (!buildSelf) {
    selectedPackages.delete(packageName);
  }
  for (const includePackage of new Set(includePackages)) {
    for (const depName of readRuntimeClosure(includePackage)) {
      selectedPackages.add(depName);
    }
  }

  const packagesToBuild = [...selectedPackages].sort();
  if (packagesToBuild.length === 0 && !buildSelf) {
    console.log(`No runtime workspace dependencies to build for ${packageName}.`);
    return;
  }

  buildPackages(packagesToBuild);
}

main();
