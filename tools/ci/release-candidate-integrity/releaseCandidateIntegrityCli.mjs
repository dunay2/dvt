import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { assessReleaseCandidateIntegrity } from './releaseCandidateIntegrity.mjs';

const SUPPORTED_ARGUMENTS = new Set(['base', 'head', 'repository']);

export function parseReleaseCandidateArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || !value) {
      throw new TypeError(`Invalid release candidate argument near ${flag ?? '<end>'}.`);
    }
    const name = flag.slice(2);
    if (!SUPPORTED_ARGUMENTS.has(name)) {
      throw new TypeError(`Unknown release candidate argument: ${flag}.`);
    }
    if (values.has(name)) {
      throw new TypeError(`Duplicate release candidate argument: ${flag}.`);
    }
    values.set(name, value);
  }

  const base = values.get('base');
  const head = values.get('head');
  const repository = values.get('repository');
  if (!base || !head || !repository) {
    throw new TypeError('Release candidate assessment requires --base, --head, and --repository.');
  }
  return { base, head, repository };
}

function resolveReleaseConfiguration(config) {
  const packageEntries = Object.keys(config.packages ?? {});
  const rootConfig = { ...config, ...(config.packages?.['.'] ?? {}) };
  const violations = [];
  if (packageEntries.length !== 1 || packageEntries[0] !== '.') {
    violations.push('Only the root package release is supported by candidate integrity.');
  }
  if (rootConfig['release-type'] !== 'node') {
    violations.push('Release candidate integrity currently requires the Node release strategy.');
  }
  if ((rootConfig['extra-files'] ?? []).length > 0) {
    violations.push('Release Please extra-files require an explicit artifact integrity policy.');
  }
  if (rootConfig['skip-changelog'] === true) {
    violations.push('Release candidate integrity requires a generated changelog.');
  }
  const changelogType = rootConfig['changelog-type'] ?? 'default';
  if (!['default', 'github'].includes(changelogType)) {
    violations.push(`Unsupported Release Please changelog type: ${changelogType}.`);
  }

  return {
    changelogType,
    changelogPath: rootConfig['changelog-path'] ?? 'CHANGELOG.md',
    expectedChangedFiles: [
      '.release-please-manifest.json',
      rootConfig['changelog-path'] ?? 'CHANGELOG.md',
      'package.json',
    ].sort(),
    violations,
  };
}

function parseRawDiff(rawDiff) {
  return rawDiff
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])\t(.+)$/iu);
      if (!match) {
        throw new Error(`Unsupported raw Git diff record: ${line}`);
      }
      return {
        oldMode: match[1],
        newMode: match[2],
        status: match[3].toUpperCase(),
        path: match[4],
      };
    });
}

export function collectReleaseCandidateSnapshot(
  { base, head, repository },
  {
    runGit = (args) => execFileSync('git', args, { encoding: 'utf8' }).trimEnd(),
    repositoryPolicyJson = process.env.RELEASE_REPOSITORY_POLICY_JSON,
  } = {}
) {
  const expectedBaseSha = runGit(['rev-parse', '--verify', `${base}^{commit}`]);
  const headSha = runGit(['rev-parse', '--verify', `${head}^{commit}`]);
  const readGitJson = (ref, filePath) => JSON.parse(runGit(['show', `${ref}:${filePath}`]));
  const readGitText = (ref, filePath) => runGit(['show', `${ref}:${filePath}`]);
  const releaseConfig = readGitJson(headSha, 'release-please-config.json');
  const resolvedConfig = resolveReleaseConfiguration(releaseConfig);
  const changedFileEntries = parseRawDiff(
    runGit(['diff', '--raw', '--no-renames', `${expectedBaseSha}...${headSha}`])
  );

  return {
    candidateParentSha: runGit(['rev-parse', `${headSha}^1`]),
    expectedBaseSha,
    headSha,
    commitCount: Number.parseInt(
      runGit(['rev-list', '--count', `${expectedBaseSha}..${headSha}`]),
      10
    ),
    mergeBaseSha: runGit(['merge-base', expectedBaseSha, headSha]),
    changedFileEntries,
    changedFiles: changedFileEntries.map((entry) => entry.path).sort(),
    expectedChangedFiles: resolvedConfig.expectedChangedFiles,
    baseManifest: readGitJson(expectedBaseSha, '.release-please-manifest.json'),
    manifest: readGitJson(headSha, '.release-please-manifest.json'),
    basePackageJson: readGitJson(expectedBaseSha, 'package.json'),
    packageJson: readGitJson(headSha, 'package.json'),
    baseChangelog: readGitText(expectedBaseSha, resolvedConfig.changelogPath),
    changelog: readGitText(headSha, resolvedConfig.changelogPath),
    changelogType: resolvedConfig.changelogType,
    repository,
    configurationViolations: resolvedConfig.violations,
    repositoryPolicy: repositoryPolicyJson ? JSON.parse(repositoryPolicyJson) : null,
  };
}

export function runReleaseCandidateIntegrityCli(argv = process.argv.slice(2), ports = undefined) {
  const snapshot = collectReleaseCandidateSnapshot(parseReleaseCandidateArguments(argv), ports);
  const result = assessReleaseCandidateIntegrity(snapshot);
  const output = JSON.stringify(
    {
      ...result,
      baseSha: snapshot.expectedBaseSha,
      headSha: snapshot.headSha,
      changedFiles: snapshot.changedFiles,
    },
    null,
    2
  );

  if (result.valid) {
    console.log(output);
    return 0;
  }
  console.error(output);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runReleaseCandidateIntegrityCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
