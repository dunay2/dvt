#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('node:fs');

function parseChangedFiles(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function runGit(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

function hasUpstream() {
  try {
    execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function hasRef(ref) {
  try {
    execSync(`git rev-parse --verify ${ref}`, {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function resolveDiffCommand() {
  if (hasRef('origin/main')) return 'git diff --name-only origin/main..HEAD';
  if (hasUpstream()) return 'git diff --name-only @{u}..HEAD';
  return 'git diff --name-only HEAD~1..HEAD';
}

function gitChangedFiles() {
  try {
    return parseChangedFiles(runGit(resolveDiffCommand()));
  } catch {
    return [];
  }
}

function isGovernedQaArtifactPath(filePath) {
  return (
    filePath.endsWith('.md') &&
    (filePath.startsWith('docs/planning/reviews/') ||
      filePath.startsWith('docs/planning/closeouts/') ||
      filePath.startsWith('docs/evidence/'))
  );
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function looksLikeQaArtifact(raw) {
  return /^qa_artifact:\s*true\s*$/im.test(raw);
}

function validateArtifact(filePath, raw) {
  const failures = [];

  const requiredHeadings = [
    '## Findings',
    '## Action Artifact',
    '## Mermaid Diagram',
    '## Final Verdict',
  ];

  for (const heading of requiredHeadings) {
    const pattern = new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    if (!pattern.test(raw)) {
      failures.push(`${filePath} -> missing required section "${heading}".`);
    }
  }

  if (!/```mermaid[\s\S]*?```/m.test(raw)) {
    failures.push(`${filePath} -> missing Mermaid code fence.`);
  }

  if (!/^- \[[ xX]\] /m.test(raw)) {
    failures.push(`${filePath} -> missing GitHub-style task checklist item.`);
  }

  if (!/^###\s+Markdown Artifact Path Suggestion\s*$/m.test(raw)) {
    failures.push(`${filePath} -> missing "Markdown Artifact Path Suggestion" subsection.`);
  }

  if (!/Definition of Done:/m.test(raw)) {
    failures.push(`${filePath} -> missing "Definition of Done:" in task details.`);
  }

  if (!/Comment with rationale:/m.test(raw)) {
    failures.push(`${filePath} -> missing "Comment with rationale:" in task details.`);
  }

  return failures;
}

function main() {
  const changedFiles = gitChangedFiles();
  if (changedFiles.length === 0) {
    console.log('[qa:artifact:check] No changed files detected. Skipping.');
    process.exit(0);
  }

  const candidateArtifacts = changedFiles
    .filter(isGovernedQaArtifactPath)
    .map((filePath) => ({ filePath, raw: readFileIfExists(filePath) }))
    .filter((entry) => entry.raw !== null)
    .filter((entry) => looksLikeQaArtifact(entry.raw));

  if (candidateArtifacts.length === 0) {
    console.log(
      '[qa:artifact:check] No changed QA artifact docs detected in governed paths. Skipping.'
    );
    process.exit(0);
  }

  const failures = [];

  for (const artifact of candidateArtifacts) {
    failures.push(...validateArtifact(artifact.filePath, artifact.raw));
  }

  if (failures.length > 0) {
    console.error('[qa:artifact:check] FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('[qa:artifact:check] OK');
}

main();
