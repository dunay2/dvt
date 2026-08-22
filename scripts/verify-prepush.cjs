#!/usr/bin/env node
/** Owned concern: run the local pre-push validation command plan. */
{
  const fs = require('node:fs');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');
  const { createSha256Hasher, utf8Bytes } = require('@dvt/crypto');

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
      if (typeof options.runGitText === 'function') {
        return options.runGitText(args, options);
      }
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
    const hash = createSha256Hasher();
    const untracked = safeRunGitText(['ls-files', '--others', '--exclude-standard'], options)
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/\\/g, '/'))
      .filter(Boolean)
      .filter((filePath) => changedFiles.includes(filePath))
      .sort();

    for (const filePath of untracked) {
      hash.update(utf8Bytes(`path:${filePath}\0`));
      const absolutePath = path.resolve(root, filePath);
      if (fs.existsSync(absolutePath)) {
        hash.update(fs.readFileSync(absolutePath));
      }
      hash.update(utf8Bytes('\0'));
    }

    return hash.digestHex();
  }

  function computePrepushStateFingerprint(changedFiles, options = {}) {
    const hash = createSha256Hasher();
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

    hash.update(utf8Bytes(JSON.stringify(changedFiles)));
    for (const args of parts) {
      hash.update(utf8Bytes(`\n$ git ${args.join(' ')}\n`));
      hash.update(utf8Bytes(safeRunGitText(args, options)));
    }
    hash.update(utf8Bytes('\nuntracked\n'));
    hash.update(utf8Bytes(untrackedFileFingerprint(changedFiles, options)));

    return hash.digestHex();
  }

  function computePrepushValidationFingerprint(changedFiles, options = {}) {
    const hash = createSha256Hasher();
    const baseRef = process.env.GIT_BASE || 'origin/main';
    const parts = [
      ['rev-parse', '--verify', 'HEAD'],
      ['rev-parse', '--verify', baseRef],
      ['diff', '--binary', '--diff-filter=ACMRD', `${baseRef}...HEAD`],
      ['diff', '--cached', '--binary', '--diff-filter=ACMRD'],
      ['diff', '--binary', '--diff-filter=ACMRD'],
    ];

    hash.update(utf8Bytes(JSON.stringify(changedFiles)));
    for (const args of parts) {
      hash.update(utf8Bytes(`\n$ git ${args.join(' ')}\n`));
      hash.update(utf8Bytes(safeRunGitText(args, options)));
    }
    hash.update(utf8Bytes('\nuntracked\n'));
    hash.update(utf8Bytes(untrackedFileFingerprint(changedFiles, options)));

    return hash.digestHex();
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
      validationFingerprint:
        options.validationFingerprint || computePrepushValidationFingerprint(changedFiles, options),
    };
  }

  function isPrepushStampValid(stamp, expected) {
    const stateMatches = stamp?.stateFingerprint === expected.stateFingerprint;
    const validationMatches =
      stamp?.validationFingerprint &&
      expected.validationFingerprint &&
      stamp.validationFingerprint === expected.validationFingerprint;

    return (
      stamp &&
      stamp.version === STAMP_VERSION &&
      validationLevelSatisfies(stamp.validationLevel, expected.validationLevel) &&
      (stateMatches || validationMatches) &&
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

  function main(argv = process.argv.slice(2), options = {}) {
    const args = parseArgs(argv);
    const root = options.repoRootPath || repoRoot;
    const changedFiles =
      options.changedFiles || listPrepushChangedFiles({ ...options, repoRootPath: root });
    const scope = classifyPrepushScope(changedFiles, { full: args.full });
    const plan = buildPrepushPlan(changedFiles, { full: args.full });
    const expectedStamp = buildPrepushStamp(changedFiles, {
      full: args.full,
      repoRootPath: root,
      stateFingerprint: options.stateFingerprint,
    });
    const readStamp = options.readPrepushStamp || readPrepushStamp;
    const removeStamp = options.removePrepushStamp || removePrepushStamp;
    const writeStamp = options.writePrepushStamp || writePrepushStamp;
    const executePlan = options.executePrepushPlan || executePrepushPlan;
    const printPlan = options.printPrepushPlan || printPrepushPlan;

    printPlan(changedFiles, scope, plan);
    if (isPrepushStampValid(readStamp({ repoRootPath: root }), expectedStamp)) {
      const source = args.hook ? 'pre-push validation' : 'validation';
      console.log(
        `[verify:prepush] matching successful ${source} stamp found; skipping duplicate run.`
      );
      return 0;
    }
    if (!args.dryRun) {
      removeStamp({ repoRootPath: root });
      executePlan(plan, { repoRootPath: root });
      writeStamp(expectedStamp, { repoRootPath: root });
    }
    return 0;
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
    computePrepushValidationFingerprint,
    computePrepushStateFingerprint,
    executePrepushPlan,
    isPrepushStampValid,
    listPrepushChangedFiles,
    main,
    parseArgs,
    readPrepushStamp,
    removePrepushStamp,
    validationLevelSatisfies,
    writePrepushStamp,
  };
}
