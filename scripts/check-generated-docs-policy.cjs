#!/usr/bin/env node
/**
 * Validate the generated documentation single-writer policy.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const defaultPolicyPath = path.join(repoRoot, 'docs', 'generated-docs-policy.json');
const policyPath = path.resolve(
  repoRoot,
  process.env.GENERATED_DOCS_POLICY_PATH || defaultPolicyPath
);
const validTracking = new Set(['tracked', 'untracked']);
const validManualEditPolicy = new Set(['generator-owned', 'source-owned']);
const validDbBackedQueryViews = new Set(['planning_query_store.governance_file_query']);

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function rel(filePath) {
  return toPosix(path.relative(repoRoot, filePath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(toPosix)
  );
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(abs));
      continue;
    }

    if (entry.isFile()) {
      out.push(rel(abs));
    }
  }
  return out;
}

function hasGlob(pattern) {
  return /[*?]/.test(pattern);
}

function escapeRegexCharacter(character) {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}

function globToRegExp(pattern) {
  let source = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];

    if (current === '*' && next === '*') {
      source += '.*';
      index += 1;
      continue;
    }

    if (current === '*') {
      source += '[^/]*';
      continue;
    }

    if (current === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegexCharacter(current);
  }

  source += '$';
  return new RegExp(source);
}

function expandPattern(pattern, candidates) {
  const normalizedPattern = toPosix(pattern);
  if (!hasGlob(normalizedPattern)) {
    return candidates.has(normalizedPattern) ? [normalizedPattern] : [];
  }

  const regex = globToRegExp(normalizedPattern);
  return [...candidates].filter((candidate) => regex.test(candidate)).sort();
}

function pathExists(sourcePath, candidates) {
  const normalizedPath = toPosix(sourcePath);
  if (hasGlob(normalizedPath)) {
    return expandPattern(normalizedPath, candidates).length > 0;
  }

  return fs.existsSync(path.join(repoRoot, ...normalizedPath.split('/')));
}

function commandIsAvailable(command, packageScripts) {
  const parts = command.trim().split(/\s+/);
  if (parts.length === 0) {
    return false;
  }

  if (parts[0] === 'pnpm') {
    const scriptName = parts[1] === 'run' ? parts[2] : parts[1];
    return Boolean(scriptName && packageScripts[scriptName]);
  }

  if (parts[0] === 'node' || parts[0] === 'tsx') {
    const commandPath = parts[1];
    return Boolean(
      commandPath && fs.existsSync(path.join(repoRoot, ...toPosix(commandPath).split('/')))
    );
  }

  return false;
}

function validateArtifactMarkers(entry, artifactPath, failures) {
  const markers = Array.isArray(entry.requiredMarkers) ? entry.requiredMarkers : [];
  if (markers.length === 0 || !artifactPath.toLowerCase().endsWith('.md')) {
    return;
  }

  const absolutePath = path.join(repoRoot, ...artifactPath.split('/'));
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  for (const marker of markers) {
    if (!content.includes(marker)) {
      failures.push(`${entry.id}: ${artifactPath} is missing generated marker: ${marker}`);
    }
  }
}

function validateArtifactSize(entry, artifactPath, failures, options = {}) {
  const absolutePath = path.join(repoRoot, ...artifactPath.split('/'));
  if (!fs.existsSync(absolutePath)) {
    return;
  }

  if (options.skipMaxBytes) {
    return;
  }

  if (
    typeof entry.maxBytes !== 'number' ||
    !Number.isFinite(entry.maxBytes) ||
    entry.maxBytes <= 0
  ) {
    return;
  }

  const { size } = fs.statSync(absolutePath);
  if (size > entry.maxBytes) {
    failures.push(`${entry.id}: ${artifactPath} exceeds maxBytes (${size} > ${entry.maxBytes}).`);
  }
}

function patternMatchesPath(pattern, artifactPath) {
  const normalizedPattern = toPosix(pattern);
  const normalizedPath = toPosix(artifactPath);
  if (!hasGlob(normalizedPattern)) {
    return normalizedPattern === normalizedPath;
  }

  return globToRegExp(normalizedPattern).test(normalizedPath);
}

function dbBackedArtifactPatternMatches(artifactPath, dbBackedArtifactPatterns) {
  return dbBackedArtifactPatterns.some((pattern) => patternMatchesPath(pattern, artifactPath));
}

function validateDbBackedArtifactGroups(entry, artifactPatterns, packageScripts, failures) {
  if (entry.dbBackedArtifacts === undefined) {
    return [];
  }

  const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : '<missing id>';
  if (!Array.isArray(entry.dbBackedArtifacts) || entry.dbBackedArtifacts.length === 0) {
    failures.push(`${id}: dbBackedArtifacts must be a non-empty array when declared`);
    return [];
  }

  const declaredArtifactPatterns = new Set(artifactPatterns.map(toPosix));
  const validPatterns = [];

  entry.dbBackedArtifacts.forEach((group, index) => {
    const prefix = `${id}: dbBackedArtifacts[${index}]`;
    const groupFailures = [];
    const groupArtifacts = Array.isArray(group?.artifacts) ? group.artifacts.map(toPosix) : [];

    if (groupArtifacts.length === 0) {
      groupFailures.push(`${prefix}.artifacts must be a non-empty array`);
    }

    for (const artifactPattern of groupArtifacts) {
      if (!declaredArtifactPatterns.has(artifactPattern)) {
        groupFailures.push(
          `${prefix}.artifacts must reference declared artifact pattern: ${artifactPattern}`
        );
      }
    }

    if (!validDbBackedQueryViews.has(group?.queryView)) {
      groupFailures.push(
        `${prefix}.queryView must be one of ${[...validDbBackedQueryViews].join(', ')}`
      );
    }

    if (typeof group?.importCommand !== 'string' || group.importCommand.trim() === '') {
      groupFailures.push(`${prefix}.importCommand must be declared`);
    } else if (!commandIsAvailable(group.importCommand, packageScripts)) {
      groupFailures.push(`${prefix}.importCommand is not available: ${group.importCommand}`);
    }

    if (typeof group?.checkCommand !== 'string' || group.checkCommand.trim() === '') {
      groupFailures.push(`${prefix}.checkCommand must be declared`);
    } else if (!commandIsAvailable(group.checkCommand, packageScripts)) {
      groupFailures.push(`${prefix}.checkCommand is not available: ${group.checkCommand}`);
    }

    failures.push(...groupFailures);
    if (groupFailures.length === 0) {
      validPatterns.push(...groupArtifacts);
    }
  });

  return validPatterns;
}

function validatePolicy(policy, trackedFiles, existingFiles, packageScripts) {
  const failures = [];

  if (policy.version !== 1) {
    failures.push('policy version must be 1');
  }

  if (!Array.isArray(policy.artifactClasses) || policy.artifactClasses.length === 0) {
    failures.push('policy must declare at least one artifact class');
    return failures;
  }

  const allCandidates = new Set([...trackedFiles, ...existingFiles]);
  const seenIds = new Set();

  for (const entry of policy.artifactClasses) {
    const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : '<missing id>';

    if (seenIds.has(id)) {
      failures.push(`${id}: duplicate artifact class id`);
    }
    seenIds.add(id);

    if (!Array.isArray(entry.artifacts) || entry.artifacts.length === 0) {
      failures.push(`${id}: artifacts must be a non-empty array`);
    }

    if (!Array.isArray(entry.sourcePaths) || entry.sourcePaths.length === 0) {
      failures.push(`${id}: sourcePaths must be a non-empty array`);
    } else {
      for (const sourcePath of entry.sourcePaths) {
        if (!pathExists(sourcePath, allCandidates)) {
          failures.push(`${id}: source path does not exist: ${sourcePath}`);
        }
      }
    }

    if (typeof entry.generatorCommand !== 'string' || entry.generatorCommand.trim() === '') {
      failures.push(`${id}: generatorCommand must be declared`);
    } else if (!commandIsAvailable(entry.generatorCommand, packageScripts)) {
      failures.push(`${id}: generator command is not available: ${entry.generatorCommand}`);
    }

    if (!validTracking.has(entry.tracking)) {
      failures.push(`${id}: tracking must be one of ${[...validTracking].join(', ')}`);
    }

    if (!validManualEditPolicy.has(entry.manualEditPolicy)) {
      failures.push(
        `${id}: manualEditPolicy must be one of ${[...validManualEditPolicy].join(', ')}`
      );
    }

    if (
      entry.maxBytes !== undefined &&
      (typeof entry.maxBytes !== 'number' ||
        !Number.isFinite(entry.maxBytes) ||
        entry.maxBytes <= 0)
    ) {
      failures.push(`${id}: maxBytes must be a positive number when declared`);
    }

    const artifactPatterns = Array.isArray(entry.artifacts) ? entry.artifacts : [];
    const dbBackedArtifactPatterns = validateDbBackedArtifactGroups(
      entry,
      artifactPatterns,
      packageScripts,
      failures
    );

    for (const artifactPattern of artifactPatterns) {
      const trackedMatches = expandPattern(artifactPattern, trackedFiles);
      const existingMatches = expandPattern(artifactPattern, existingFiles);

      if (entry.tracking === 'tracked') {
        if (trackedMatches.length === 0) {
          failures.push(`${id}: tracked artifact is not tracked by git: ${artifactPattern}`);
        }
        if (existingMatches.length === 0) {
          failures.push(`${id}: tracked artifact does not exist: ${artifactPattern}`);
        }
      }

      if (entry.tracking === 'untracked' && trackedMatches.length > 0) {
        failures.push(
          `${id}: generated artifact must remain untracked: ${trackedMatches.join(', ')}`
        );
      }

      const markerTargets = [...new Set([...trackedMatches, ...existingMatches])];
      for (const artifactPath of markerTargets) {
        validateArtifactMarkers(entry, artifactPath, failures);
        validateArtifactSize(entry, artifactPath, failures, {
          skipMaxBytes: dbBackedArtifactPatternMatches(artifactPath, dbBackedArtifactPatterns),
        });
      }
    }
  }

  return failures;
}

function main() {
  const policy = readJson(policyPath);
  const trackedFiles = getTrackedFiles();
  const existingFiles = new Set(walkFiles(repoRoot));
  const rootPackage = readJson(path.join(repoRoot, 'package.json'));
  const failures = validatePolicy(policy, trackedFiles, existingFiles, rootPackage.scripts || {});

  if (failures.length > 0) {
    console.error('[generated-docs-policy] FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `[generated-docs-policy] OK: ${policy.artifactClasses.length} generated artifact classes validated.`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  commandIsAvailable,
  dbBackedArtifactPatternMatches,
  expandPattern,
  globToRegExp,
  patternMatchesPath,
  validateArtifactSize,
  validateDbBackedArtifactGroups,
  validatePolicy,
};
