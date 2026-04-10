#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readWorkspaceGlobs() {
  const workspaceConfigPath = path.join(repoRoot, 'pnpm-workspace.yaml');
  const workspaceConfig = yaml.load(fs.readFileSync(workspaceConfigPath, 'utf8'));
  const globs = workspaceConfig?.packages;

  if (!Array.isArray(globs) || globs.some((entry) => typeof entry !== 'string')) {
    fail('INVALID_PNPM_WORKSPACE_GLOBS');
  }

  return globs.map((entry) => `${entry}/package.json`);
}

function escapeRegexCharacter(character) {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}

function globToRegExp(pattern) {
  let source = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];

    if (current === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (current === '*') {
      source += '[^/]*';
      continue;
    }

    source += escapeRegexCharacter(current);
  }

  source += '$';
  return new RegExp(source);
}

function matchesAnyPattern(relativePath, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(relativePath));
}

function collectPackageJsonPaths(rootDir) {
  const packageJsonPaths = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === 'package.json') {
        packageJsonPaths.push(fullPath);
      }
    }
  }

  return packageJsonPaths;
}

function collectWorkspacePackageJsonPaths() {
  const workspacePatterns = readWorkspaceGlobs();
  return collectPackageJsonPaths(repoRoot).filter((absolutePath) => {
    const relativePath = path.relative(repoRoot, absolutePath).replaceAll('\\', '/');
    return matchesAnyPattern(relativePath, workspacePatterns);
  });
}

function buildWorkspaceManifestMap() {
  const manifests = new Map();

  for (const manifestPath of collectWorkspacePackageJsonPaths()) {
    const manifest = readJson(manifestPath);
    if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0) {
      continue;
    }

    manifests.set(manifest.name, {
      dir: path.dirname(manifestPath),
      manifest,
    });
  }

  return manifests;
}

function getRuntimeWorkspaceDeps(manifests, packageName) {
  const entry = manifests.get(packageName);
  if (!entry) {
    fail(`WORKSPACE_PACKAGE_NOT_FOUND: ${packageName}`);
  }

  const deps = new Set();
  const queue = [
    ...Object.keys(entry.manifest.dependencies ?? {}),
    ...Object.keys(entry.manifest.optionalDependencies ?? {}),
  ];

  while (queue.length > 0) {
    const depName = queue.shift();
    if (!depName || deps.has(depName) || !manifests.has(depName)) {
      continue;
    }

    deps.add(depName);
    const depManifest = manifests.get(depName).manifest;
    queue.push(
      ...Object.keys(depManifest.dependencies ?? {}),
      ...Object.keys(depManifest.optionalDependencies ?? {})
    );
  }

  return deps;
}

function parseArgs(argv) {
  const [packageName, ...rest] = argv;
  if (!packageName) {
    fail(
      'USAGE: node scripts/build-workspace-runtime-deps.cjs <workspace-package> [--include-package <workspace-package> ...]'
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

function main() {
  const { packageName, includePackages, buildSelf } = parseArgs(process.argv.slice(2));
  const manifests = buildWorkspaceManifestMap();

  const selectedPackages = getRuntimeWorkspaceDeps(manifests, packageName);

  for (const includePackage of includePackages) {
    if (!manifests.has(includePackage)) {
      fail(`WORKSPACE_PACKAGE_NOT_FOUND: ${includePackage}`);
    }

    selectedPackages.add(includePackage);
    for (const depName of getRuntimeWorkspaceDeps(manifests, includePackage)) {
      selectedPackages.add(depName);
    }
  }

  if (selectedPackages.size === 0 && !buildSelf) {
    console.log(`No runtime workspace dependencies to build for ${packageName}.`);
    return;
  }

  if (selectedPackages.size > 0) {
    const args = ['--workspace-concurrency=4'];
    for (const selectedPackage of selectedPackages) {
      args.push('--filter', selectedPackage);
    }
    args.push('--if-present', 'run', 'build');

    const result = spawnSync('pnpm', args, {
      cwd: repoRoot,
      env: { ...process.env, DVT_CI: '1' },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    if (result.error) {
      fail(`PNPM_SPAWN_FAILED: ${result.error.message}`);
    }

    if ((result.status ?? 1) !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  if (!buildSelf) {
    return;
  }

  const buildSelfResult = spawnSync('pnpm', ['--filter', packageName, 'build'], {
    cwd: repoRoot,
    env: { ...process.env, DVT_CI: '1' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (buildSelfResult.error) {
    fail(`PNPM_SPAWN_FAILED: ${buildSelfResult.error.message}`);
  }

  process.exit(buildSelfResult.status ?? 1);
}

main();
