/**
 * Owned concern: exact validation-input identities and persisted pre-push receipts.
 * @baseline ADR-0053: reusable evidence retains complete input and validation-level identity.
 * @decision Preserve Git fingerprints and receipt matching independently of CLI execution.
 * @consequence Callers must await successful validation; partial iteration cannot write acceptance.
 * @version 1.0.0
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createSha256Hasher, utf8Bytes } = require('@dvt/crypto');
const repoRoot = path.resolve(__dirname, '../..');
const STAMP_VERSION = 2;
const STAMP_PURPOSE = 'local-push-readiness';

function runGitText(args, options = {}) {
  return execFileSync('git', args, {
    cwd: options.repoRootPath || repoRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
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
  const git = options.runGitText || runGitText;
  const untracked = git(['ls-files', '--others', '--exclude-standard'], options)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, '/'))
    .filter(Boolean)
    .filter((filePath) => changedFiles.includes(filePath))
    .sort();

  for (const filePath of untracked) {
    hash.update(utf8Bytes(`path:${filePath}\0`));
    const absolutePath = path.resolve(root, filePath);
    hash.update(fs.readFileSync(absolutePath));
    hash.update(utf8Bytes('\0'));
  }

  return hash.digestHex();
}

function computePrepushStateFingerprint(changedFiles, options = {}) {
  const hash = createSha256Hasher();
  hash.update(
    utf8Bytes(
      options.validationFingerprint || computePrepushValidationFingerprint(changedFiles, options)
    )
  );
  // A first push legitimately has no upstream; required validation evidence is never optional.
  const upstream = safeRunGitText(['rev-parse', '--verify', '@{u}^{commit}'], options).trim();
  hash.update(utf8Bytes(`\nupstream:${upstream}\n`));
  if (upstream) {
    const git = options.runGitText || runGitText;
    hash.update(
      utf8Bytes(git(['diff', '--binary', '--diff-filter=ACMRD', `${upstream}...HEAD`], options))
    );
  }
  return hash.digestHex();
}

function computePrepushValidationFingerprint(changedFiles, options = {}) {
  const hash = createSha256Hasher();
  const baseRef = process.env.GIT_BASE || 'origin/main';
  const git = options.runGitText || runGitText;
  const [head, base, comparisonHead] = ['HEAD', baseRef, process.env.GIT_HEAD || 'HEAD'].map(
    (ref) => git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], options).trim()
  );
  const parts = [
    ['diff', '--binary', '--diff-filter=ACMRD', `${base}...${head}`],
    ['diff', '--cached', '--binary', '--diff-filter=ACMRD'],
    ['diff', '--binary', '--diff-filter=ACMRD'],
  ];

  hash.update(
    utf8Bytes(
      JSON.stringify({
        changedFiles,
        head,
        base,
        comparisonHead,
        snapshot: Boolean(process.env.GIT_HEAD),
      })
    )
  );
  for (const args of parts) {
    hash.update(utf8Bytes(`\n$ git ${args.join(' ')}\n`));
    hash.update(utf8Bytes(git(args, options)));
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
  const validationFingerprint =
    options.validationFingerprint || computePrepushValidationFingerprint(changedFiles, options);
  return {
    version: STAMP_VERSION,
    purpose: STAMP_PURPOSE,
    platform: options.platform ?? process.platform,
    validationLevel: validationLevel(options),
    changedFiles: [...changedFiles],
    stateFingerprint:
      options.stateFingerprint ||
      computePrepushStateFingerprint(changedFiles, {
        ...options,
        validationFingerprint,
      }),
    validationFingerprint,
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
    stamp.purpose === STAMP_PURPOSE &&
    stamp.platform === expected.platform &&
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

module.exports = {
  buildPrepushStamp,
  isPrepushStampValid,
  readPrepushStamp,
  writePrepushStamp,
  validationLevelSatisfies,
};
