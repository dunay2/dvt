#!/usr/bin/env node
/** Owned concern: run the local pre-push validation command plan. */
{
  const crypto = require('node:crypto');
  const fs = require('node:fs');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');

  const {
    buildPrepushPlan,
    classifyPrepushScope,
    commandLabel,
    executeCommandPlan,
  } = require('./local-validation-plan.cjs');
  const { listLocalChangedFiles } = require('./git-local-changes.cjs');

  const repoRoot = path.resolve(__dirname, '..');
  const STAMP_VERSION = 1;

  function listPrepushChangedFiles(options = {}) {
    return listLocalChangedFiles({
      ...options,
      repoRootPath: options.repoRootPath || repoRoot,
      diffFilter: 'ACMRD',
    });
  }

  function executePrepushPlan(plan, options = {}) {
    executeCommandPlan(plan, {
      ...options,
      label: 'verify:prepush',
      throwOnError: true,
    });
  }

  function parseArgs(argv) {
    return {
      dryRun: argv.includes('--dry-run') || argv.includes('--plan'),
      full: argv.includes('--full'),
      hook: argv.includes('--hook'),
    };
  }

  function runGitText(args, options = {}) {
    return execFileSync('git', args, {
      cwd: options.repoRootPath || repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  }

  function safeRunGitText(args, options = {}) {
    try {
      return runGitText(args, options);
    } catch {
      return '';
    }
  }

  function resolvePrepushStampPath(options = {}) {
    const output = safeRunGitText(['rev-parse', '--git-path', 'dvt-prepush-ok.json'], options)
      .trim()
      .replace(/\\/g, '/');

    return path.resolve(options.repoRootPath || repoRoot, output || '.git/dvt-prepush-ok.json');
  }

  function untrackedFileFingerprint(changedFiles, options = {}) {
    const root = options.repoRootPath || repoRoot;
    const hash = crypto.createHash('sha256');
    const untracked = safeRunGitText(['ls-files', '--others', '--exclude-standard'], options)
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/\\/g, '/'))
      .filter(Boolean)
      .filter((filePath) => changedFiles.includes(filePath))
      .sort();

    for (const filePath of untracked) {
      hash.update(`path:${filePath}\0`);
      const absolutePath = path.resolve(root, filePath);
      if (fs.existsSync(absolutePath)) {
        hash.update(fs.readFileSync(absolutePath));
      }
      hash.update('\0');
    }

    return hash.digest('hex');
  }

  function computePrepushStateFingerprint(changedFiles, options = {}) {
    const hash = crypto.createHash('sha256');
    const baseRef = process.env.GIT_BASE || 'origin/main';
    const parts = [
      ['rev-parse', '--verify', 'HEAD'],
      ['rev-parse', '--verify', baseRef],
      ['rev-parse', '--verify', '@{u}'],
      ['diff', '--binary', '--diff-filter=ACMRD', `${baseRef}...HEAD`],
      ['diff', '--binary', '--diff-filter=ACMRD', '@{u}...HEAD'],
      ['diff', '--cached', '--binary', '--diff-filter=ACMRD'],
      ['diff', '--binary', '--diff-filter=ACMRD'],
    ];

    hash.update(JSON.stringify(changedFiles));
    for (const args of parts) {
      hash.update(`\n$ git ${args.join(' ')}\n`);
      hash.update(safeRunGitText(args, options));
    }
    hash.update('\nuntracked\n');
    hash.update(untrackedFileFingerprint(changedFiles, options));

    return hash.digest('hex');
  }

  function validationLevel(options = {}) {
    return options.full ? 'full' : 'default';
  }

  function validationLevelSatisfies(actual, required) {
    return actual === 'full' || actual === required;
  }

  function buildPrepushStamp(changedFiles, options = {}) {
    return {
      version: STAMP_VERSION,
      validationLevel: validationLevel(options),
      changedFiles: [...changedFiles],
      stateFingerprint:
        options.stateFingerprint || computePrepushStateFingerprint(changedFiles, options),
    };
  }

  function isPrepushStampValid(stamp, expected) {
    return (
      stamp &&
      stamp.version === STAMP_VERSION &&
      validationLevelSatisfies(stamp.validationLevel, expected.validationLevel) &&
      stamp.stateFingerprint === expected.stateFingerprint &&
      JSON.stringify(stamp.changedFiles || []) === JSON.stringify(expected.changedFiles || [])
    );
  }

  function readPrepushStamp(options = {}) {
    try {
      return JSON.parse(fs.readFileSync(resolvePrepushStampPath(options), 'utf8'));
    } catch {
      return null;
    }
  }

  function writePrepushStamp(stamp, options = {}) {
    const stampPath = resolvePrepushStampPath(options);
    fs.mkdirSync(path.dirname(stampPath), { recursive: true });
    fs.writeFileSync(stampPath, `${JSON.stringify(stamp, null, 2)}\n`);
  }

  function removePrepushStamp(options = {}) {
    try {
      fs.rmSync(resolvePrepushStampPath(options), { force: true });
    } catch {
      // A missing validation stamp only means the hook must run normally.
    }
  }

  function printPrepushPlan(changedFiles, scope, plan) {
    console.log('[verify:prepush] changed files:');
    if (changedFiles.length === 0) {
      console.log('- none');
    } else {
      for (const filePath of changedFiles) {
        console.log(`- ${filePath}`);
      }
    }

    console.log('[verify:prepush] scope:');
    for (const [key, value] of Object.entries(scope)) {
      console.log(`- ${key}: ${value}`);
    }

    console.log('[verify:prepush] planned steps:');
    for (const step of plan) {
      console.log(`- ${step.id}: ${commandLabel(step)}`);
    }
  }

  function main(argv = process.argv.slice(2)) {
    const args = parseArgs(argv);
    const changedFiles = listPrepushChangedFiles({ repoRootPath: repoRoot });
    const scope = classifyPrepushScope(changedFiles, { full: args.full });
    const plan = buildPrepushPlan(changedFiles, { full: args.full });
    const expectedStamp = buildPrepushStamp(changedFiles, {
      full: args.full,
      repoRootPath: repoRoot,
    });

    printPrepushPlan(changedFiles, scope, plan);
    if (
      args.hook &&
      isPrepushStampValid(readPrepushStamp({ repoRootPath: repoRoot }), expectedStamp)
    ) {
      console.log(
        '[verify:prepush] matching successful pre-push validation stamp found; skipping duplicate hook run.'
      );
      return;
    }
    if (!args.dryRun) {
      removePrepushStamp({ repoRootPath: repoRoot });
      executePrepushPlan(plan, { repoRootPath: repoRoot });
      writePrepushStamp(expectedStamp, { repoRootPath: repoRoot });
    }
  }

  if (require.main === module) {
    try {
      main();
    } catch (error) {
      console.error(`[verify:prepush] ${error.message}`);
      process.exit(1);
    }
  }

  module.exports = {
    buildPrepushPlan,
    buildPrepushStamp,
    classifyPrepushScope,
    commandLabel,
    computePrepushStateFingerprint,
    executePrepushPlan,
    isPrepushStampValid,
    listPrepushChangedFiles,
    parseArgs,
    removePrepushStamp,
    validationLevelSatisfies,
  };
}
