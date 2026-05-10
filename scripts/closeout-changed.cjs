#!/usr/bin/env node
/** Owned concern: run the governed closeout sequence for the current changed slice. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { listLocalChangedFiles, toPosix } = require('./git-local-changes.cjs');

const repoRoot = path.resolve(__dirname, '..');

const GOVERNANCE_REGEN_STEPS = [
  {
    id: 'docs-gov-manifest',
    command: 'pnpm',
    args: ['docs:gov:manifest'],
  },
  {
    id: 'docs-governance-document-unit-map',
    command: 'pnpm',
    args: ['docs:governance:document-unit-map'],
  },
  {
    id: 'docs-governance-file-component-index',
    command: 'pnpm',
    args: ['docs:governance:file-component-index'],
  },
  {
    id: 'docs-governance-file-fingerprint-baseline',
    command: 'pnpm',
    args: ['docs:governance:file-fingerprint-baseline'],
  },
  {
    id: 'docs-governance-file-fingerprint-impact',
    command: 'pnpm',
    args: ['docs:governance:file-fingerprint-impact'],
  },
  {
    id: 'docs-governance-coverage-report',
    command: 'pnpm',
    args: ['docs:governance:coverage-report'],
  },
  {
    id: 'docs-governance-remediation-queue',
    command: 'pnpm',
    args: ['docs:governance:remediation-queue'],
  },
];

const GOVERNANCE_STABILIZE_STEPS = [
  {
    id: 'docs-governance-file-component-index-final',
    command: 'pnpm',
    args: ['docs:governance:file-component-index'],
  },
  {
    id: 'docs-governance-file-fingerprint-baseline-final',
    command: 'pnpm',
    args: ['docs:governance:file-fingerprint-baseline'],
  },
  {
    id: 'docs-governance-file-fingerprint-impact-final',
    command: 'pnpm',
    args: ['docs:governance:file-fingerprint-impact'],
  },
];

function normalizeChangedFiles(changedFiles) {
  return Array.from(new Set(changedFiles.map(toPosix).filter(Boolean))).sort();
}

function hasDocsChange(changedFiles) {
  return changedFiles.some((filePath) => filePath.startsWith('docs/'));
}

function hasLaneRegistryChange(changedFiles) {
  return changedFiles.some((filePath) =>
    /^docs\/planning\/state\/agent-lane-[a-e]\.yaml$/i.test(filePath)
  );
}

function hasWorkspaceSourceChange(changedFiles) {
  return changedFiles.some(
    (filePath) => filePath.startsWith('apps/') || filePath.startsWith('packages/')
  );
}

function pushStepOnce(steps, step) {
  if (!steps.some((candidate) => candidate.id === step.id)) {
    steps.push(step);
  }
}

function listCloseoutChangedFiles(options = {}) {
  return listLocalChangedFiles({
    ...options,
    repoRootPath: options.repoRootPath || repoRoot,
    diffFilter: 'ACMRD',
  });
}

function buildCloseoutPlan(changedFiles) {
  const normalizedChangedFiles = normalizeChangedFiles(changedFiles);
  const steps = [];

  if (hasDocsChange(normalizedChangedFiles)) {
    pushStepOnce(steps, {
      id: 'docs-sync',
      command: 'pnpm',
      args: ['docs:sync'],
    });
  }

  if (hasLaneRegistryChange(normalizedChangedFiles)) {
    pushStepOnce(steps, {
      id: 'planning-db-import',
      command: 'pnpm',
      args: ['planning:db:import'],
    });
    pushStepOnce(steps, {
      id: 'docs-workboard-generate',
      command: 'pnpm',
      args: ['docs:workboard:generate'],
    });
  }

  if (hasWorkspaceSourceChange(normalizedChangedFiles)) {
    pushStepOnce(steps, {
      id: 'docs-status-generate',
      command: 'pnpm',
      args: ['docs:status:generate'],
    });
  }

  for (const step of GOVERNANCE_REGEN_STEPS) {
    pushStepOnce(steps, step);
  }
  for (const step of GOVERNANCE_STABILIZE_STEPS) {
    pushStepOnce(steps, step);
  }

  pushStepOnce(steps, {
    id: 'planning-db-import-final',
    command: 'pnpm',
    args: ['planning:db:import'],
  });
  pushStepOnce(steps, {
    id: 'planning-db-check',
    command: 'pnpm',
    args: ['planning:db:check'],
  });
  pushStepOnce(steps, {
    id: 'planning-db-export-check',
    command: 'pnpm',
    args: ['planning:db:export:check'],
  });
  pushStepOnce(steps, {
    id: 'governance-db-check',
    command: 'pnpm',
    args: ['governance:db:check'],
  });
  pushStepOnce(steps, {
    id: 'governance-db-export-check',
    command: 'pnpm',
    args: ['governance:db:export:check'],
  });
  pushStepOnce(steps, {
    id: 'git-diff-check',
    command: 'git',
    args: ['diff', '--check'],
  });
  pushStepOnce(steps, {
    id: 'git-diff-cached-check',
    command: 'git',
    args: ['diff', '--cached', '--check'],
  });
  pushStepOnce(steps, {
    id: 'conflict-marker-scan',
    internal: 'conflict-marker-scan',
  });
  pushStepOnce(steps, {
    id: 'verify-prepush',
    command: 'pnpm',
    args: ['verify:prepush'],
  });

  return steps;
}

function commandLabel(step) {
  if (step.command) {
    return [step.command, ...step.args].join(' ');
  }
  if (step.internal === 'conflict-marker-scan') {
    return 'internal conflict marker scan';
  }
  return step.id;
}

function isProbablyText(buffer) {
  return !buffer.includes(0);
}

function readChangedTextFiles(changedFiles, rootPath = repoRoot) {
  const resolvedRootPath = path.resolve(rootPath);

  return normalizeChangedFiles(changedFiles)
    .map((filePath) => {
      const absolutePath = path.resolve(resolvedRootPath, filePath);
      const relativePath = path.relative(resolvedRootPath, absolutePath);
      if (
        relativePath.startsWith('..') ||
        path.isAbsolute(relativePath) ||
        !fs.existsSync(absolutePath)
      ) {
        return null;
      }

      const stats = fs.statSync(absolutePath);
      if (!stats.isFile()) {
        return null;
      }

      const buffer = fs.readFileSync(absolutePath);
      if (!isProbablyText(buffer)) {
        return null;
      }

      return {
        path: filePath,
        content: buffer.toString('utf8'),
      };
    })
    .filter(Boolean);
}

function assertNoConflictMarkers(files) {
  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    const markerIndex = lines.findIndex((line) => /^(<<<<<<<|=======|>>>>>>>)(?:\s|$)/.test(line));
    if (markerIndex >= 0) {
      throw new Error(`Unresolved conflict marker in ${file.path}:${markerIndex + 1}`);
    }
  }
}

function runCommand(step, options = {}) {
  const result = spawnSync(step.command, step.args, {
    cwd: options.repoRootPath || repoRoot,
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${commandLabel(step)} failed with exit code ${result.status || 1}`);
  }
}

function executeCloseoutPlan(plan, changedFiles, options = {}) {
  for (const step of plan) {
    console.log(`[closeout:changed] ${commandLabel(step)}`);
    if (step.internal === 'conflict-marker-scan') {
      const scanChangedFiles =
        typeof options.listChangedFiles === 'function'
          ? options.listChangedFiles()
          : listCloseoutChangedFiles({ repoRootPath: options.repoRootPath || repoRoot });
      assertNoConflictMarkers(
        readChangedTextFiles(scanChangedFiles || changedFiles, options.repoRootPath || repoRoot)
      );
      continue;
    }
    runCommand(step, options);
  }
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run') || argv.includes('--plan'),
  };
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const changedFiles = listCloseoutChangedFiles({ repoRootPath: repoRoot });
  const plan = buildCloseoutPlan(changedFiles);

  console.log('[closeout:changed] changed files:');
  if (changedFiles.length === 0) {
    console.log('- none');
  } else {
    for (const filePath of changedFiles) {
      console.log(`- ${filePath}`);
    }
  }

  console.log('[closeout:changed] planned steps:');
  for (const step of plan) {
    console.log(`- ${step.id}: ${commandLabel(step)}`);
  }

  if (args.dryRun) {
    return;
  }

  executeCloseoutPlan(plan, changedFiles, { repoRootPath: repoRoot });
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[closeout:changed] ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  assertNoConflictMarkers,
  buildCloseoutPlan,
  commandLabel,
  executeCloseoutPlan,
  listCloseoutChangedFiles,
  readChangedTextFiles,
};
