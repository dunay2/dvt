/** Owned concern: refresh Git-derived governance surfaces without rebuilding Planning DB. */
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createSha256Hasher, sha256Hex, utf8Bytes } = require('@dvt/crypto');

const {
  applyGovernanceRefreshRunRecordOperation,
} = require('./planning-db/governance-refresh-write-rail.cjs');

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
        id: 'code-status-local',
        script: 'docs:status:generate',
        args: ['--code-state-only'],
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
        id: 'coverage-report',
        script: 'docs:governance:coverage-report',
      },
      {
        id: 'remediation-queue',
        script: 'docs:governance:remediation-queue',
      },
    ],
    databaseStages: [],
  };
}

function pnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function runPnpmScript(script, stage = {}) {
  const command = pnpmCommand();
  const result = childProcess.spawnSync(command, [script, ...(stage.args || [])], {
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

      return `${file}\0${stat.size}\0${sha256Hex(fs.readFileSync(absolutePath))}`;
    })
    .join('\0');
}

function walkFiles(rootPath) {
  const stat = fs.statSync(rootPath, { throwIfNoEntry: false });
  if (!stat) {
    return [];
  }

  if (stat.isFile()) {
    return [rootPath];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .flatMap((entry) => walkFiles(path.join(rootPath, entry.name)))
    .sort();
}

function readGeneratedGovernanceArtifactHashes(rootPath = repoRoot) {
  const generatedStatusDir = path.join(rootPath, '.generated-docs', 'planning', 'status');
  return walkFiles(generatedStatusDir)
    .map((file) => {
      const stat = fs.statSync(file);
      const relativePath = path.relative(rootPath, file).replace(/\\/g, '/');
      return `${relativePath}\0${stat.size}\0${sha256Hex(fs.readFileSync(file))}`;
    })
    .join('\0');
}

function readWorktreeFingerprint() {
  const hash = createSha256Hasher();

  hash.update(utf8Bytes('unstaged\0'));
  hash.update(utf8Bytes(runText('git', ['diff', '--binary', '--', '.'])));
  hash.update(utf8Bytes('\0staged\0'));
  hash.update(utf8Bytes(runText('git', ['diff', '--cached', '--binary', '--', '.'])));
  hash.update(utf8Bytes('\0untracked\0'));
  hash.update(utf8Bytes(readUntrackedFileHashes()));
  hash.update(utf8Bytes('\0generated-governance\0'));
  hash.update(utf8Bytes(readGeneratedGovernanceArtifactHashes()));

  return hash.digestHex();
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
  let generationPasses = 0;
  const stabilizeGeneration = (startingFingerprint) => {
    let previousFingerprint = startingFingerprint;

    for (let pass = 1; pass <= maxPasses; pass += 1) {
      generationPasses += 1;
      logger.log(`[governance:refresh] generation pass ${pass}/${maxPasses}`);

      for (const stage of stages.generationStages) {
        logger.log(`[governance:refresh] pnpm ${stage.script}`);
        runScript(stage.script, stage);
        generationStagesRun.push(stage.script);
      }

      const currentFingerprint = readFingerprint();
      if (currentFingerprint === previousFingerprint) return currentFingerprint;
      previousFingerprint = currentFingerprint;
    }

    throw new Error(`Governance refresh did not stabilize after ${maxPasses} generation pass(es).`);
  };

  stabilizeGeneration(readFingerprint());

  logger.log(
    `[governance:refresh] generated surfaces stable after ${generationPasses} generation pass(es)`
  );

  const runDatabaseStage = (stage) => {
    logger.log(`[governance:refresh] pnpm ${stage.script}`);
    runScript(stage.script, stage);
    databaseStagesRun.push(stage.script);
  };
  for (const stage of stages.databaseStages) runDatabaseStage(stage);

  return {
    stabilized: true,
    generationPasses,
    generationStagesRun,
    databaseStagesRun,
  };
}

function defaultRefreshActor() {
  return process.env.GITHUB_ACTOR || process.env.USERNAME || process.env.USER || 'local';
}

function defaultRefreshRunId(now = new Date()) {
  return `governance-refresh-${now
    .toISOString()
    .replace(/[^0-9]/g, '')
    .slice(0, 14)}`;
}

function readGovernanceRefreshSourceContentSha256() {
  return sha256Hex(fs.readFileSync(__filename));
}

function buildGovernanceRefreshRunRecordCommand(record) {
  return {
    kind: 'governance_refresh_run_record',
    runId: record.runId,
    runState: record.runState,
    actor: record.actor,
    commandName: 'pnpm governance:refresh',
    sourceRef: record.sourceRef,
    sourceContentSha256: record.sourceContentSha256,
    maxPasses: record.maxPasses,
    generationPasses: record.generationPasses,
    stabilized: record.stabilized,
    errorSummary: record.errorSummary || '',
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    stages: record.stages,
    result: record.result,
    idempotencyKey: [
      'governance_refresh_run_record',
      record.runId,
      record.runState,
      record.sourceContentSha256,
    ].join(':'),
  };
}

async function recordGovernanceRefreshRun(record) {
  return applyGovernanceRefreshRunRecordOperation(buildGovernanceRefreshRunRecordCommand(record));
}

async function runGovernanceRefreshCommand(options = {}, deps = {}) {
  const now = deps.now || (() => new Date());
  const startedAt = now();
  const stages = options.stages ?? buildRefreshStages();
  const runId = options.runId || defaultRefreshRunId(startedAt);
  const actor = options.actor || defaultRefreshActor();
  const maxPasses = options.maxPasses ?? defaultMaxPasses;
  const sourceRef = options.sourceRef || 'scripts/governance-refresh.cjs';
  const sourceContentSha256 =
    options.sourceContentSha256 || readGovernanceRefreshSourceContentSha256();
  const runRefresh = deps.runRefresh || runGovernanceRefresh;
  const recordAcceptedRun = deps.recordAcceptedRun || recordGovernanceRefreshRun;
  const recordCompletedRun = deps.recordCompletedRun || recordGovernanceRefreshRun;
  const recordFailedRun = deps.recordFailedRun || recordGovernanceRefreshRun;
  const baseRecord = {
    runId,
    actor,
    maxPasses,
    sourceRef,
    sourceContentSha256,
    startedAt: toIsoLike(startedAt),
  };

  await recordAcceptedRun({
    ...baseRecord,
    runState: 'accepted',
    generationPasses: 0,
    stabilized: null,
  });

  try {
    const result = runRefresh({ ...options, stages, maxPasses });
    const completedAt = now();
    await recordCompletedRun({
      ...baseRecord,
      runState: 'passed',
      generationPasses: result.generationPasses,
      stabilized: result.stabilized,
      completedAt: toIsoLike(completedAt),
      stages,
      result,
    });
    return result;
  } catch (error) {
    const completedAt = now();
    await recordFailedRun({
      ...baseRecord,
      runState: 'failed',
      generationPasses: 0,
      stabilized: false,
      completedAt: toIsoLike(completedAt),
      errorSummary: error.message,
      stages,
      result: {
        generationPasses: 0,
        generationStagesRun: [],
        databaseStagesRun: [],
      },
    });
    throw error;
  }
}

function toIsoLike(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  await runGovernanceRefreshCommand(options);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[governance:refresh] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  defaultMaxPasses,
  repoRoot,
  buildRefreshStages,
  pnpmCommand,
  readGeneratedGovernanceArtifactHashes,
  runPnpmScript,
  runText,
  readUntrackedFileHashes,
  readWorktreeFingerprint,
  runGovernanceRefresh,
  runGovernanceRefreshCommand,
  parseArgs,
};
