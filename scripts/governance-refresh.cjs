const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const defaultMaxPasses = 3;

function buildRefreshStages() {
  return {
    generationStages: [
      {
        id: 'docs-sync',
        script: 'docs:sync',
      },
      {
        id: 'code-status',
        script: 'docs:status:generate',
      },
      {
        id: 'capability-coverage',
        script: 'docs:capability:generate',
      },
      {
        id: 'docs-manifest',
        script: 'docs:gov:manifest',
      },
      {
        id: 'document-unit-map',
        script: 'docs:governance:document-unit-map',
      },
      {
        id: 'file-component-index',
        script: 'docs:governance:file-component-index',
      },
      {
        id: 'file-fingerprint-baseline',
        script: 'docs:governance:file-fingerprint-baseline',
      },
      {
        id: 'file-fingerprint-impact',
        script: 'docs:governance:file-fingerprint-impact',
      },
      {
        id: 'planning-db-import',
        script: 'planning:db:import',
      },
      {
        id: 'workboard',
        script: 'docs:workboard:generate',
      },
      {
        id: 'coverage-report',
        script: 'docs:governance:coverage-report',
        env: {
          DVT_GOVERNANCE_REPORT_SOURCE: 'db',
        },
      },
      {
        id: 'remediation-queue',
        script: 'docs:governance:remediation-queue',
        env: {
          DVT_GOVERNANCE_REPORT_SOURCE: 'db',
        },
      },
    ],
    databaseStages: [
      {
        id: 'planning-db-check',
        script: 'planning:db:check',
      },
      {
        id: 'planning-db-export-check',
        script: 'planning:db:export:check',
      },
      {
        id: 'governance-db-check',
        script: 'governance:db:check',
      },
    ],
  };
}

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function runPnpmScript(script, stage = {}) {
  const command = pnpmCommand();
  const result = childProcess.spawnSync(command, [script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...(stage.env || {}),
    },
    stdio: 'inherit',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`pnpm ${script} failed with exit code ${result.status}`);
  }
}

function runText(command, args) {
  const result = childProcess.spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }

  return result.stdout ?? '';
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function readUntrackedFileHashes() {
  const output = runText('git', ['ls-files', '--others', '--exclude-standard', '-z']);
  const files = output.split('\0').filter(Boolean).sort();

  return files
    .map((file) => {
      const absolutePath = path.join(repoRoot, ...file.split('/'));
      const stat = fs.statSync(absolutePath, { throwIfNoEntry: false });
      if (!stat || !stat.isFile()) {
        return `${file}\0missing-or-non-file`;
      }

      return `${file}\0${stat.size}\0${sha256(fs.readFileSync(absolutePath))}`;
    })
    .join('\0');
}

function readWorktreeFingerprint() {
  const hash = crypto.createHash('sha256');

  hash.update('unstaged\0');
  hash.update(runText('git', ['diff', '--binary', '--', '.']));
  hash.update('\0staged\0');
  hash.update(runText('git', ['diff', '--cached', '--binary', '--', '.']));
  hash.update('\0untracked\0');
  hash.update(readUntrackedFileHashes());

  return hash.digest('hex');
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

function runGovernanceRefresh(options = {}) {
  const stages = options.stages ?? buildRefreshStages();
  const maxPasses = options.maxPasses ?? defaultMaxPasses;
  const runScript = options.runScript ?? runPnpmScript;
  const readFingerprint = options.readFingerprint ?? readWorktreeFingerprint;
  const logger = options.logger ?? console;

  assertPositiveInteger(maxPasses, 'maxPasses');

  const generationStagesRun = [];
  const databaseStagesRun = [];
  let previousFingerprint = readFingerprint();
  let generationPasses = 0;
  let stabilized = false;

  for (let pass = 1; pass <= maxPasses; pass += 1) {
    generationPasses = pass;
    logger.log(`[governance:refresh] generation pass ${pass}/${maxPasses}`);

    for (const stage of stages.generationStages) {
      logger.log(`[governance:refresh] pnpm ${stage.script}`);
      runScript(stage.script, stage);
      generationStagesRun.push(stage.script);
    }

    const currentFingerprint = readFingerprint();
    if (currentFingerprint === previousFingerprint) {
      stabilized = true;
      break;
    }

    previousFingerprint = currentFingerprint;
  }

  if (!stabilized) {
    throw new Error(`Governance refresh did not stabilize after ${maxPasses} generation pass(es).`);
  }

  logger.log(
    `[governance:refresh] generated surfaces stable after ${generationPasses} generation pass(es)`
  );

  for (const stage of stages.databaseStages) {
    logger.log(`[governance:refresh] pnpm ${stage.script}`);
    runScript(stage.script, stage);
    databaseStagesRun.push(stage.script);
  }

  return {
    stabilized,
    generationPasses,
    generationStagesRun,
    databaseStagesRun,
  };
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--max-passes') {
      const value = Number.parseInt(args[index + 1], 10);
      if (Number.isNaN(value)) {
        throw new Error('--max-passes requires an integer value.');
      }
      options.maxPasses = value;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown governance refresh option "${arg}".`);
  }

  return options;
}

function printHelp() {
  console.log('Usage: pnpm governance:refresh [--max-passes <count>]');
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  runGovernanceRefresh(options);
}

if (require.main === module) {
  main();
}

module.exports = {
  defaultMaxPasses,
  repoRoot,
  buildRefreshStages,
  pnpmCommand,
  runPnpmScript,
  runText,
  sha256,
  readUntrackedFileHashes,
  readWorktreeFingerprint,
  runGovernanceRefresh,
  parseArgs,
};
