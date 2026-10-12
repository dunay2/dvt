/** Shared isolated real-Git fixture for evidence-reader contract tests. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { FeatureMechanizationGitDiffReader } = require('./feature-mechanization-git-diff.cjs');

function repository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-git-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'Fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      },
    }).trim();
  git('init', '--quiet', '--initial-branch=main');
  const write = (name, value) => fs.writeFileSync(path.join(root, name), value);
  const commit = (parent) => {
    git('add', '--all');
    const tree = git('write-tree');
    const sha = git('commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', 'Fixture');
    git('update-ref', 'HEAD', sha);
    return sha;
  };
  write('model.ts', 'export const model = 1;\n');
  write('retired.ts', 'export const retired = true;\n');
  const base = commit();
  const reader = (options = {}) =>
    new FeatureMechanizationGitDiffReader({
      repoRootPath: root,
      baseRef: base,
      headRef: 'HEAD',
      includeWorktree: !options.headRef,
      ...options,
    });
  return { root, git, write, commit, base, reader };
}

module.exports = { repository };
