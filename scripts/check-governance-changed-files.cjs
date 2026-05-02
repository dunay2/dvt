#!/usr/bin/env node
/**
 * Validate that every changed file is covered by the governance indexes.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const statusDir = path.join(repoRoot, 'docs', 'planning', 'status');
const fileIndexPath = path.join(statusDir, 'system-governance-file-index.files.yaml');
const baselinePath = path.join(statusDir, 'system-governance-file-fingerprint-baseline.yaml');
const baselineRepoPath = 'docs/planning/status/system-governance-file-fingerprint-baseline.yaml';
const gitOutputMaxBuffer = 16 * 1024 * 1024;
const selfNormalizedGeneratedPaths = new Set([
  baselineRepoPath,
  'docs/planning/status/system-governance-file-index.files.yaml',
]);

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function parseArgs(argv) {
  const args = {
    base: process.env.GIT_BASE,
    head: process.env.GIT_HEAD || 'HEAD',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--base') {
      args.base = argv[index + 1];
      index += 1;
    } else if (value === '--head') {
      args.head = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function readYamlFromGit(ref, repoPath) {
  const output = execFileSync('git', ['show', `${ref}:${repoPath}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: gitOutputMaxBuffer,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return yaml.load(output);
}

function readNameStatusDiff(base, head, git = execGit) {
  return dedupeChanges(
    parseNameStatus(git(['diff', '--name-status', '--find-renames', `${base}...${head}`]))
  );
}

function resolveBaseRef(candidates, git = execGit) {
  const errors = [];
  for (const candidate of candidates.filter(Boolean)) {
    try {
      git(['rev-parse', '--verify', `${candidate}^{commit}`]);
      return candidate;
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(
    `Unable to resolve governance changed-files base ref. Tried: ${candidates.join(
      ', '
    )}. ${errors.join(' | ')}`
  );
}

function execGit(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: gitOutputMaxBuffer,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function changeKey(change) {
  return [change.status, change.oldPath || '', change.path].join('\0');
}

function dedupeChanges(changes) {
  const byKey = new Map();
  for (const change of changes) {
    if (change.status === 'M') {
      const addedKey = changeKey({ status: 'A', path: change.path });
      if (byKey.has(addedKey)) {
        continue;
      }
    }
    byKey.set(changeKey(change), change);
  }
  return [...byKey.values()];
}

function parseNameStatus(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split('\t');
      const rawStatus = columns[0];
      const status = rawStatus[0];

      if (status === 'R') {
        return {
          status,
          score: rawStatus.slice(1),
          oldPath: toPosix(columns[1]),
          path: toPosix(columns[2]),
        };
      }

      return {
        status,
        path: toPosix(columns[1]),
      };
    });
}

function entriesByPath(manifest) {
  return new Map((manifest.files || []).map((entry) => [entry.path, entry]));
}

function isUngoverned(entry) {
  return (
    !entry ||
    entry.owningUnit === 'UNOWNED' ||
    entry.ownerLevel === 'unowned' ||
    entry.unitStatus === 'unowned' ||
    entry.dddOwner === 'unowned' ||
    entry.cqRails === 'unowned' ||
    entry.rootUnit === 'UNOWNED' ||
    entry.domainUnit === 'UNOWNED' ||
    entry.componentUnit === 'UNOWNED'
  );
}

function isLegacyOrDrift(entry) {
  return Boolean(
    entry?.isLegacy || entry?.isDrift || ['legacy', 'drift'].includes(entry?.unitStatus)
  );
}

function requireActiveGovernance(pathName, currentIndexByPath, currentBaselineByPath, errors) {
  const indexEntry = currentIndexByPath.get(pathName);
  const baselineEntry = currentBaselineByPath.get(pathName);

  if (!indexEntry) {
    errors.push(`${pathName} changed but is missing from the governance file index.`);
    return null;
  }

  if (!baselineEntry) {
    errors.push(`${pathName} changed but is missing from the accepted fingerprint baseline.`);
  }

  if (isUngoverned(indexEntry)) {
    errors.push(`${pathName} changed but is still classified as ungoverned.`);
  }

  if (isLegacyOrDrift(indexEntry)) {
    errors.push(`${pathName} changed while owned by a legacy/drift governance unit.`);
  }

  return { indexEntry, baselineEntry };
}

function validateAdded(change, context, errors) {
  requireActiveGovernance(
    change.path,
    context.currentIndexByPath,
    context.currentBaselineByPath,
    errors
  );

  if (context.baseBaselineByPath.has(change.path)) {
    errors.push(
      `${change.path} is marked added but already exists in the base fingerprint baseline.`
    );
  }
}

function validateModified(change, context, errors) {
  const current = requireActiveGovernance(
    change.path,
    context.currentIndexByPath,
    context.currentBaselineByPath,
    errors
  );
  const baseEntry = context.baseBaselineByPath.get(change.path);

  if (!baseEntry) {
    errors.push(`${change.path} is modified but is missing from the base fingerprint baseline.`);
    return;
  }

  if (
    current?.baselineEntry?.stateFingerprint === baseEntry.stateFingerprint &&
    !selfNormalizedGeneratedPaths.has(change.path)
  ) {
    errors.push(`${change.path} is modified but its accepted fingerprint did not change.`);
  }
}

function validateDeleted(change, context, errors) {
  if (!context.baseBaselineByPath.has(change.path)) {
    errors.push(`${change.path} is deleted but was not present in the base fingerprint baseline.`);
  }

  if (
    context.currentIndexByPath.has(change.path) ||
    context.currentBaselineByPath.has(change.path)
  ) {
    errors.push(`${change.path} is deleted but is still present in current governance indexes.`);
  }
}

function validateRenamed(change, context, errors) {
  if (!context.baseBaselineByPath.has(change.oldPath)) {
    errors.push(
      `${change.oldPath} is renamed but was not present in the base fingerprint baseline.`
    );
  }

  if (
    context.currentIndexByPath.has(change.oldPath) ||
    context.currentBaselineByPath.has(change.oldPath)
  ) {
    errors.push(
      `${change.oldPath} was renamed but is still present in current governance indexes.`
    );
  }

  requireActiveGovernance(
    change.path,
    context.currentIndexByPath,
    context.currentBaselineByPath,
    errors
  );
}

function validateChangedFiles({ changes, baseBaseline, currentBaseline, currentFileIndex }) {
  const errors = [];
  const context = {
    baseBaselineByPath: entriesByPath(baseBaseline),
    currentBaselineByPath: entriesByPath(currentBaseline),
    currentIndexByPath: entriesByPath(currentFileIndex),
  };
  const summary = {
    added: 0,
    modified: 0,
    deleted: 0,
    renamed: 0,
    skipped: 0,
  };

  for (const change of changes) {
    if (change.status === 'A') {
      summary.added += 1;
      validateAdded(change, context, errors);
    } else if (change.status === 'M') {
      summary.modified += 1;
      validateModified(change, context, errors);
    } else if (change.status === 'D') {
      summary.deleted += 1;
      validateDeleted(change, context, errors);
    } else if (change.status === 'R') {
      summary.renamed += 1;
      validateRenamed(change, context, errors);
    } else {
      summary.skipped += 1;
    }
  }

  return { errors, summary };
}

function printResult(result) {
  const summary = Object.entries(result.summary)
    .map(([name, count]) => `${name}=${count}`)
    .join(', ');

  if (result.errors.length > 0) {
    console.error('[docs:governance:changed-files] FAILED');
    console.error(`Change summary: ${summary}`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    return;
  }

  console.log(`[docs:governance:changed-files] OK (${summary})`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = resolveBaseRef([args.base, 'origin/main', 'upstream/main', 'main']);
  const changes = readNameStatusDiff(base, args.head);
  const result = validateChangedFiles({
    changes,
    baseBaseline: readYamlFromGit(base, baselineRepoPath),
    currentBaseline: readYaml(baselinePath),
    currentFileIndex: readYaml(fileIndexPath),
  });

  printResult(result);

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  parseNameStatus,
  readNameStatusDiff,
  resolveBaseRef,
  validateChangedFiles,
};
