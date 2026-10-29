/**
 * @file scripts/planning-db/operate/evidence-origin.cjs
 * @ownedConcern Real Git/GitHub execution-origin identity and authenticity.
 * @baseline ADR-0061: Planning DB architecture and Git physical source authority.
 * @decision Keep existing named implementations in their cohesive operational concern.
 * @consequence Reuse direct references and the same native authorization, replay and transaction rails.
 * @version 1.0.0
 */

const { spawnSync } = require('node:child_process');

const { normalizeOptionalText } = require('./command-values.cjs');

const { sha256Hex } = require('@dvt/crypto');

function normalizeGitHubRepositorySlug(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\.git$/u, '')
    .replace(/\/$/u, '');
  const match =
    normalized.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u) ||
    normalized.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u) ||
    normalized.match(/^git@github\.com:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u) ||
    normalized.match(/^ssh:\/\/git@github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/u);
  if (!match) {
    throw new Error(`cannot resolve canonical GitHub repository from ${normalized || 'empty'}`);
  }
  return match[1];
}

function readGitValue(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.repoRoot || require('node:path').resolve(__dirname, '../..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr || result.stdout).trim() || `git ${args.join(' ')} failed`
    );
  }
  return String(result.stdout).trim();
}

function readGitFileAtCommit(commitSha, filePath, options = {}) {
  if (typeof options.readGitFileAtCommit === 'function') {
    const content = options.readGitFileAtCommit(commitSha, filePath);
    return Buffer.isBuffer(content) ? content : Buffer.from(content);
  }
  const result = spawnSync('git', ['show', `${commitSha}:${filePath}`], {
    cwd: options.repoRoot || require('node:path').resolve(__dirname, '../..'),
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      String(result.stderr || result.stdout).trim() || `git show ${commitSha}:${filePath} failed`
    );
  }
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || '');
}

async function readGitHubActionsEvidence(url, options = {}) {
  const fetchImplementation = options.fetch || globalThis.fetch;
  if (typeof fetchImplementation !== 'function') {
    throw new Error('GitHub API fetch is unavailable');
  }
  const environment = options.environment || process.env;
  const token = options.githubToken || environment.GITHUB_TOKEN || environment.GH_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'dvt-planning-db-evidence-verifier',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImplementation(url, { headers });
  if (!response?.ok) {
    throw new Error(`GitHub API ${url} returned HTTP ${response?.status ?? 'unknown'}`);
  }
  return response.json();
}

async function assertArchitectureEvidenceOriginAuthenticity(command, options = {}) {
  if (command.evidenceOrigin !== 'ci_execution') {
    return command;
  }
  try {
    const sourceMatch = command.sourceRef.match(
      /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/actions\/runs\/([1-9]\d*)\/job\/([1-9]\d*)$/u
    );
    if (!sourceMatch) {
      throw new Error('source-ref must identify one concrete GitHub Actions job');
    }
    if (command.evidenceKind !== 'ci') {
      throw new Error('ci_execution requires evidence-kind=ci');
    }

    const sourceRepositorySlug = `${sourceMatch[1]}/${sourceMatch[2]}`;
    const canonicalRepositorySlug = normalizeGitHubRepositorySlug(
      options.repositorySlug || readGitValue(['remote', 'get-url', 'origin'], options)
    );
    if (sourceRepositorySlug.toLowerCase() !== canonicalRepositorySlug.toLowerCase()) {
      throw new Error(
        `source repository ${sourceRepositorySlug} is not canonical repository ${canonicalRepositorySlug}`
      );
    }

    const currentGitSha = String(
      options.currentGitSha || readGitValue(['rev-parse', 'HEAD'], options)
    )
      .trim()
      .toLowerCase();
    if (!/^[a-f0-9]{40}$/u.test(currentGitSha)) {
      throw new Error(`current commit ${currentGitSha || 'empty'} is not a full Git SHA`);
    }

    const runId = Number(sourceMatch[3]);
    const jobId = Number(sourceMatch[4]);
    const apiRepositorySlug = canonicalRepositorySlug
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const [run, job] = await Promise.all([
      readGitHubActionsEvidence(
        `https://api.github.com/repos/${apiRepositorySlug}/actions/runs/${runId}`,
        options
      ),
      readGitHubActionsEvidence(
        `https://api.github.com/repos/${apiRepositorySlug}/actions/jobs/${jobId}`,
        options
      ),
    ]);
    if (
      Number(run.id) !== runId ||
      String(run.repository?.full_name || '').toLowerCase() !==
        canonicalRepositorySlug.toLowerCase() ||
      run.html_url !== `https://github.com/${sourceRepositorySlug}/actions/runs/${runId}`
    ) {
      throw new Error('GitHub API run identity does not match source-ref and repository');
    }
    if (
      Number(job.id) !== jobId ||
      Number(job.run_id) !== runId ||
      job.html_url !== command.sourceRef ||
      !normalizeOptionalText(job.name)
    ) {
      throw new Error('GitHub API job identity does not match source-ref and run');
    }
    if (run.status !== 'completed' || job.status !== 'completed') {
      throw new Error('GitHub Actions run and job must both be completed');
    }
    if (
      command.resultState === 'pass' &&
      (run.conclusion !== 'success' || job.conclusion !== 'success')
    ) {
      throw new Error('pass evidence requires a successful completed job and run');
    }
    if (command.resultState === 'fail' && job.conclusion === 'success') {
      throw new Error('fail evidence requires a non-successful completed job');
    }
    if (
      String(run.head_sha || '').toLowerCase() !== currentGitSha ||
      String(job.head_sha || '').toLowerCase() !== currentGitSha
    ) {
      throw new Error('GitHub Actions evidence does not prove the current commit');
    }
    const committedSourceSha256 = sha256Hex(
      readGitFileAtCommit(currentGitSha, command.sourcePath, options)
    );
    if (committedSourceSha256 !== command.sourceContentSha256) {
      throw new Error(
        `source bytes at the proven commit hash to ${committedSourceSha256}, not ${command.sourceContentSha256}`
      );
    }
    if (command.subjectKind === 'command' || command.subjectKind === 'query') {
      const subjectImplementation = options.subjectImplementation;
      if (
        !subjectImplementation ||
        !Array.isArray(subjectImplementation.implementation_files) ||
        subjectImplementation.implementation_files.length === 0 ||
        !subjectImplementation.rail_source_path ||
        !subjectImplementation.rail_source_content_sha256
      ) {
        throw new Error(
          `canonical implementation inputs are missing for ${command.subjectKind} ${command.subjectId}`
        );
      }
      const implementationInputs = new Map([
        [subjectImplementation.rail_source_path, subjectImplementation.rail_source_content_sha256],
        ...subjectImplementation.implementation_files.map((implementationFile) => [
          implementationFile.implementation_path,
          implementationFile.implementation_content_hash,
        ]),
      ]);
      for (const [implementationPath, expectedHash] of implementationInputs) {
        const committedImplementationSha256 = sha256Hex(
          readGitFileAtCommit(currentGitSha, implementationPath, options)
        );
        if (committedImplementationSha256 !== expectedHash) {
          throw new Error(
            `implementation bytes at the proven commit for ${implementationPath} hash to ${committedImplementationSha256}, not ${expectedHash}`
          );
        }
      }
    }
    return command;
  } catch (error) {
    throw new Error(
      `ARCH-EVIDENCE-CI-ORIGIN-UNVERIFIED: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

module.exports = {
  assertArchitectureEvidenceOriginAuthenticity,
  readGitFileAtCommit,
  readGitValue,
};
