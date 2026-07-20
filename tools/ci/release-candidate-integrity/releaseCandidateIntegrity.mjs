const RELEASE_HEADING = /^##\s+(?:\[(\d+\.\d+\.\d+)\]|(\d+\.\d+\.\d+))(?:\s|\(|$)/u;
const CHANGELOG_METADATA_SECTIONS = new Set(['new contributors']);
const STRICT_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const REQUIRED_CHECK_CONTEXTS = ['All Checks Required for Merge', 'Release candidate integrity'];
const GITHUB_ACTIONS_APP_ID = 15368;
const GITHUB_PULL_REQUEST_TRAILER =
  /\s+by\s+@\S+\s+in\s+https:\/\/github\.com\/([^/\s]+\/[^/\s]+)\/pull\/(\d+)\s*$/iu;
const DEFAULT_COMMIT_TRAILER =
  /\(\[[0-9a-f]{7,40}\]\(https?:\/\/[^)\s]+\/commit\/([0-9a-f]{7,40})\)\)\s*$/iu;

function normalizeText(value) {
  return String(value).replace(/\r\n/gu, '\n').trimEnd();
}

function normalizeReleaseEntryTitle(line) {
  return String(line)
    .replace(/^[*-]\s+/u, '')
    .replace(DEFAULT_COMMIT_TRAILER, '')
    .replace(GITHUB_PULL_REQUEST_TRAILER, '')
    .replace(/\s+\(#\d+\)\s*$/u, '')
    .replace(/\*\*/gu, '')
    .replace(/^([^:]+):\s+/u, '$1:')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

function releaseEntrySourceIdentity(line, { changelogType = 'auto', repository } = {}) {
  if (changelogType === 'github' || changelogType === 'auto') {
    const pullRequest = String(line).match(GITHUB_PULL_REQUEST_TRAILER);
    if (
      pullRequest &&
      (!repository || pullRequest[1].toLowerCase() === String(repository).toLowerCase())
    ) {
      return `pr:${pullRequest[2]}`;
    }
  }
  if (changelogType === 'default' || changelogType === 'auto') {
    const commit = String(line).match(DEFAULT_COMMIT_TRAILER)?.[1];
    if (commit) {
      return `commit:${commit.toLowerCase()}`;
    }
  }
  return null;
}

function parseReleaseBlocks(changelog, options = {}) {
  const lines = normalizeText(changelog).split('\n');
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(RELEASE_HEADING);
    if (match) {
      headings.push({ index, version: match[1] ?? match[2] });
    }
  }

  return headings.map((heading, releaseIndex) => {
    const endIndex = headings[releaseIndex + 1]?.index ?? lines.length;
    const entries = [];
    let section = 'uncategorized';
    for (const line of lines.slice(heading.index + 1, endIndex)) {
      const sectionMatch = line.match(/^#{2,3}\s+(.+?)\s*$/u);
      if (sectionMatch) {
        section = sectionMatch[1];
        continue;
      }
      if (!/^[*-]\s+/u.test(line)) {
        continue;
      }
      if (CHANGELOG_METADATA_SECTIONS.has(section.trim().toLowerCase())) {
        continue;
      }
      const titleIdentity = normalizeReleaseEntryTitle(line);
      const sourceIdentity = releaseEntrySourceIdentity(line, options);
      entries.push({
        section,
        line,
        identity: sourceIdentity ?? `unidentified:${titleIdentity}`,
        titleIdentity,
        sourceIdentity,
      });
    }
    return {
      version: heading.version,
      entries,
      startLine: heading.index,
      endLine: endIndex,
      lines: lines.slice(heading.index, endIndex),
      preamble: lines.slice(0, heading.index),
    };
  });
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function withoutProperty(value, property) {
  const copy = { ...(value ?? {}) };
  delete copy[property];
  return copy;
}

function parseVersion(version) {
  const match = String(version ?? '').match(STRICT_SEMVER);
  return match ? match.slice(1).map(BigInt) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

function changelogPreservesHistory(baseChangelog, candidateChangelog) {
  const baseReleases = parseReleaseBlocks(baseChangelog);
  const candidateReleases = parseReleaseBlocks(candidateChangelog);
  if (baseReleases.length === 0 || candidateReleases.length < 2) {
    return false;
  }
  const base = normalizeText(baseChangelog).split('\n');
  const candidate = normalizeText(candidateChangelog).split('\n');
  const baseFirst = baseReleases[0];
  const candidateFirst = candidateReleases[0];
  const candidatePrevious = candidateReleases[1];

  return (
    normalizeText(candidate.slice(0, candidateFirst.startLine).join('\n')) ===
      normalizeText(base.slice(0, baseFirst.startLine).join('\n')) &&
    normalizeText(candidate.slice(candidatePrevious.startLine).join('\n')) ===
      normalizeText(base.slice(baseFirst.startLine).join('\n'))
  );
}

export function extractLatestRelease(changelog, options = {}) {
  const latest = parseReleaseBlocks(changelog, options)[0];
  return latest ?? { version: null, entries: [] };
}

export function normalizeReleaseEntryIdentity(_section, line, options = {}) {
  return (
    releaseEntrySourceIdentity(line, options) ?? `unidentified:${normalizeReleaseEntryTitle(line)}`
  );
}

export function assessRepositoryMergePolicy(policy) {
  const violations = [];
  const repository = policy?.repository ?? {};
  const mainRuleset = policy?.mainRuleset ?? {};
  const allowedMergeMethods = [...(mainRuleset.allowedMergeMethods ?? [])].sort();
  const requiredStatusChecks = mainRuleset.requiredStatusChecks ?? [];

  if (repository.allowMergeCommit !== false) {
    violations.push('Release pull-request policy still allows plain merge commits.');
  }
  if (repository.allowRebaseMerge !== false) {
    violations.push('Release pull-request policy still allows rebase merges.');
  }
  if (repository.allowSquashMerge !== true) {
    violations.push('Release pull-request policy does not allow squash merges.');
  }
  if (repository.squashMergeCommitTitle !== 'PR_TITLE') {
    violations.push('Squash commits must use the pull-request title as their title.');
  }
  if (repository.squashMergeCommitMessage !== 'BLANK') {
    violations.push(
      'Squash commit bodies must be blank to avoid replaying internal commit identities.'
    );
  }
  if (allowedMergeMethods.length !== 1 || allowedMergeMethods[0] !== 'squash') {
    violations.push('The main ruleset must expose squash as its sole allowed merge method.');
  }
  if (mainRuleset.target !== 'branch') {
    violations.push('The protected main ruleset must target branches.');
  }
  if (mainRuleset.enforcement !== 'active') {
    violations.push('The protected main ruleset must be active.');
  }
  const includedRefs = mainRuleset.conditions?.refName?.include ?? [];
  const excludedRefs = mainRuleset.conditions?.refName?.exclude ?? [];
  const explicitDefaultRef = `refs/heads/${repository.defaultBranch ?? 'main'}`;
  if (
    !includedRefs.some((ref) => ref === '~DEFAULT_BRANCH' || ref === explicitDefaultRef) ||
    excludedRefs.some((ref) => ref === '~DEFAULT_BRANCH' || ref === explicitDefaultRef)
  ) {
    violations.push('The protected branch ruleset must apply unequivocally to main.');
  }
  if ((mainRuleset.bypassActors ?? []).length > 0) {
    violations.push('The protected main ruleset must not expose bypass actors.');
  }
  if (mainRuleset.strictRequiredStatusChecksPolicy !== true) {
    violations.push('Required status checks must require an up-to-date branch.');
  }
  for (const requiredContext of REQUIRED_CHECK_CONTEXTS) {
    if (
      !requiredStatusChecks.some(
        (check) =>
          check.context === requiredContext && Number(check.integrationId) === GITHUB_ACTIONS_APP_ID
      )
    ) {
      violations.push(
        `The main ruleset must require the ${requiredContext} status check from GitHub Actions.`
      );
    }
  }

  return violations;
}

export function assessReleaseCandidateIntegrity(candidate) {
  const violations = [...(candidate.configurationViolations ?? [])];
  const record = (condition, message) => {
    if (!condition) {
      violations.push(message);
    }
  };
  const changelogOptions = {
    changelogType: candidate.changelogType,
    repository: candidate.repository,
  };
  const latestRelease = extractLatestRelease(candidate.changelog, changelogOptions);
  const baseRelease = extractLatestRelease(candidate.baseChangelog, {
    changelogType: 'auto',
    repository: candidate.repository,
  });
  const candidateVersions = [
    candidate.manifest?.['.'],
    candidate.packageJson?.version,
    latestRelease.version,
  ];
  const baseVersions = [
    candidate.baseManifest?.['.'],
    candidate.basePackageJson?.version,
    baseRelease.version,
  ];
  const distinctCandidateVersions = new Set(candidateVersions.filter(Boolean));
  const distinctBaseVersions = new Set(baseVersions.filter(Boolean));
  const parsedCandidateVersion = parseVersion(candidate.packageJson?.version);
  const parsedBaseVersion = parseVersion(candidate.basePackageJson?.version);
  const actualFiles = new Set(candidate.changedFiles ?? []);
  const expectedFiles = new Set(candidate.expectedChangedFiles ?? []);
  const unexpectedFiles = [...actualFiles].filter((filePath) => !expectedFiles.has(filePath));
  const missingFiles = [...expectedFiles].filter((filePath) => !actualFiles.has(filePath));
  const changedFileEntries = candidate.changedFileEntries ?? [];

  record(
    candidate.candidateParentSha === candidate.expectedBaseSha,
    'Candidate parent SHA does not match the exact current main SHA.'
  );
  record(
    candidate.mergeBaseSha === candidate.expectedBaseSha,
    'Candidate merge base does not match the exact current main SHA.'
  );
  record(candidate.commitCount === 1, 'Release candidate must contain exactly one commit.');
  record(
    unexpectedFiles.length === 0,
    `Found unexpected candidate file(s): ${unexpectedFiles.join(', ')}`
  );
  record(
    missingFiles.length === 0,
    `Missing generated candidate file(s): ${missingFiles.join(', ')}`
  );
  for (const filePath of actualFiles) {
    const entries = changedFileEntries.filter((entry) => entry.path === filePath);
    record(
      entries.length === 1 &&
        entries[0].status === 'M' &&
        entries[0].oldMode === '100644' &&
        entries[0].newMode === '100644',
      `Release artifact ${filePath} must be one regular file modification without a mode change.`
    );
  }
  record(
    baseVersions.every(Boolean) && distinctBaseVersions.size === 1,
    `Base release versions do not match: manifest=${baseVersions[0] ?? 'missing'}, package=${baseVersions[1] ?? 'missing'}, changelog=${baseVersions[2] ?? 'missing'}.`
  );
  record(
    candidateVersions.every(Boolean) && distinctCandidateVersions.size === 1,
    `Release versions do not match: manifest=${candidateVersions[0] ?? 'missing'}, package=${candidateVersions[1] ?? 'missing'}, changelog=${candidateVersions[2] ?? 'missing'}.`
  );
  record(
    Boolean(parsedCandidateVersion),
    'Release candidate version must be strict major.minor.patch SemVer.'
  );
  record(
    Boolean(parsedBaseVersion),
    'Base release version must be strict major.minor.patch SemVer.'
  );
  if (parsedCandidateVersion && parsedBaseVersion) {
    record(
      compareVersions(parsedCandidateVersion, parsedBaseVersion) > 0,
      'Release candidate version must be greater than base version.'
    );
    record(
      parsedCandidateVersion[0] === 0n,
      'Release candidate must remain on the pre-1.0 development line.'
    );
  }
  record(
    canonicalJson(withoutProperty(candidate.packageJson, 'version')) ===
      canonicalJson(withoutProperty(candidate.basePackageJson, 'version')),
    'Release candidate package.json may change only version.'
  );
  record(
    canonicalJson(withoutProperty(candidate.manifest, '.')) ===
      canonicalJson(withoutProperty(candidate.baseManifest, '.')),
    'Release Please manifest may change only the governed root version.'
  );
  record(
    changelogPreservesHistory(candidate.baseChangelog, candidate.changelog),
    'Release candidate must preserve the complete previous changelog and prepend one release.'
  );
  record(
    latestRelease.entries.length > 0,
    'Release candidate changelog must contain release entries.'
  );
  if (candidate.changelogType === 'github') {
    for (const entry of latestRelease.entries) {
      record(
        entry.sourceIdentity?.startsWith('pr:'),
        'Every GitHub changelog entry must end with its canonical pull-request identity.'
      );
    }
  } else if (candidate.changelogType === 'default') {
    for (const entry of latestRelease.entries) {
      record(
        entry.sourceIdentity?.startsWith('commit:'),
        'Every default changelog entry must end with its canonical commit identity.'
      );
    }
  } else {
    violations.push(`Unsupported changelog type: ${candidate.changelogType ?? 'missing'}.`);
  }

  const entryCounts = new Map();
  for (const entry of latestRelease.entries) {
    entryCounts.set(entry.identity, (entryCounts.get(entry.identity) ?? 0) + 1);
  }
  for (const [identity, count] of entryCounts) {
    if (count > 1) {
      violations.push(`Found duplicate logical changelog entry: ${identity}.`);
    }
  }

  const previousSourceIdentities = new Set(
    parseReleaseBlocks(candidate.baseChangelog, {
      changelogType: 'auto',
      repository: candidate.repository,
    })
      .flatMap((release) => release.entries)
      .map((entry) => entry.sourceIdentity)
      .filter(Boolean)
  );
  for (const entry of latestRelease.entries) {
    if (entry.sourceIdentity && previousSourceIdentities.has(entry.sourceIdentity)) {
      violations.push(`Release entry was already published: ${entry.sourceIdentity}.`);
    }
  }
  violations.push(...assessRepositoryMergePolicy(candidate.repositoryPolicy));

  return {
    valid: violations.length === 0,
    version: latestRelease.version,
    entryCount: latestRelease.entries.length,
    violations,
  };
}
