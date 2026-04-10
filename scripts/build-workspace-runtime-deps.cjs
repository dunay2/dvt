#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');

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

  return { packageName, includePackages, buildSelf };
}

function isWorkspacePackage(entry) {
  return (
    entry &&
    typeof entry.name === 'string' &&
    typeof entry.path === 'string' &&
    path.resolve(entry.path).startsWith(repoRoot)
  );
}

function readRuntimeClosure(packageName) {
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

  if (!Array.isArray(packages) || packages.length === 0) {
    fail(`WORKSPACE_PACKAGE_NOT_FOUND: ${packageName}`);
  }

  const closure = new Set();
  for (const entry of packages) {
    if (!isWorkspacePackage(entry)) {
      continue;
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

  const args = ['--workspace-concurrency=4'];
  for (const packageName of packageNames) {
    args.push('--filter', packageName);
  }
  args.push('--if-present', 'run', 'build');

  runPnpm(args, {
    env: { ...process.env, DVT_CI: '1' },
    stdio: 'inherit',
  });
}

function buildPackageSelf(packageName) {
  runPnpm(['--filter', packageName, 'build'], {
    env: { ...process.env, DVT_CI: '1' },
    stdio: 'inherit',
  });
}

function main() {
  const { packageName, includePackages, buildSelf } = parseArgs(process.argv.slice(2));
  const selectedPackages = readRuntimeClosure(packageName);
  selectedPackages.delete(packageName);

  for (const includePackage of includePackages) {
    for (const depName of readRuntimeClosure(includePackage)) {
      selectedPackages.add(depName);
    }
  }

  if (buildSelf) {
    selectedPackages.delete(packageName);
  }

  const packagesToBuild = [...selectedPackages].sort();
  if (packagesToBuild.length === 0 && !buildSelf) {
    console.log(`No runtime workspace dependencies to build for ${packageName}.`);
    return;
  }

  buildPackages(packagesToBuild);

  if (buildSelf) {
    buildPackageSelf(packageName);
  }
}

main();
