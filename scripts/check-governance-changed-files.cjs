#!/usr/bin/env node
/**
 * Owned concern: validate changed files against governance indexes and fingerprints.
 *
 * Validate that every changed file is covered by the governance indexes.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const yaml = require('js-yaml');
const { readFileIndexFromDisk } = require('./generate-governance-file-component-index.cjs');
const { governanceGeneratedPath, repoRoot, toPosix } = require('./governance-generated-paths.cjs');

const fileIndexPath = governanceGeneratedPath('system-governance-file-index.files.yaml');
const baselinePath = governanceGeneratedPath('system-governance-file-fingerprint-baseline.yaml');
const gitOutputMaxBuffer = 16 * 1024 * 1024;

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

function readNameStatusDiff(base, head, git = execGit) {
  return dedupeChanges(
    parseNameStatus(git(['diff', '--name-status', '--find-renames', `${base}...${head}`]))
  );
}

function readLocalNameStatusDiff(base, head, git = execGit) {
  const changes = [
    ...parseNameStatus(git(['diff', '--name-status', '--find-renames', `${base}...${head}`])),
    ...parseNameStatus(git(['diff', '--cached', '--name-status', '--find-renames'])),
    ...parseNameStatus(git(['diff', '--name-status', '--find-renames'])),
    ...readUntrackedNameStatus(git),
  ];

  return dedupeChanges(changes);
}

function readUntrackedNameStatus(git = execGit) {
  return git(['ls-files', '--others', '--exclude-standard'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((filePath) => ({
      status: 'A',
      path: toPosix(filePath),
    }));
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
  const deletedPaths = new Set(
    changes.filter((change) => change.status === 'D').map((change) => change.path)
  );
  const addedPaths = new Set(
    changes.filter((change) => change.status === 'A').map((change) => change.path)
  );
  const byKey = new Map();
  for (const change of changes) {
    if (change.status !== 'D' && deletedPaths.has(change.path)) {
      continue;
    }
    if (change.status === 'M' && addedPaths.has(change.path)) {
      continue;
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
    errors.push(
      `${pathName} changed but is missing from the current generated fingerprint baseline.`
    );
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
}

function validateModified(change, context, errors) {
  requireActiveGovernance(
    change.path,
    context.currentIndexByPath,
    context.currentBaselineByPath,
    errors
  );
}

function validateDeleted(change, context, errors) {
  if (
    context.currentIndexByPath.has(change.path) ||
    context.currentBaselineByPath.has(change.path)
  ) {
    errors.push(`${change.path} is deleted but is still present in current governance indexes.`);
  }
}

function validateRenamed(change, context, errors) {
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

function validateChangedFiles({ changes, currentBaseline, currentFileIndex }) {
  const errors = [];
  const context = {
    currentBaselineByPath: entriesByPath(currentBaseline),
    currentIndexByPath: entriesByPath(currentFileIndex),
  };
  const summary = {
    added: 0,
    modified: 0,
    deleted: 0,
    renamed: 0,
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
      errors.push(`${change.path} has unsupported change status ${change.status}.`);
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
  const changes = readLocalNameStatusDiff(base, args.head);
  const result = validateChangedFiles({
    changes,
    currentBaseline: readYaml(baselinePath),
    currentFileIndex: { files: readFileIndexFromDisk(fileIndexPath) },
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
  readLocalNameStatusDiff,
  readNameStatusDiff,
  resolveBaseRef,
  validateChangedFiles,
};
