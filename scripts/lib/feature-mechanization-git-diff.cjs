/** Owned concern: acquire real Git candidate evidence without success fallbacks. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

class FeatureMechanizationGitDiffReader {
  constructor(options = {}) {
    this.baseRef = options.baseRef || process.env.GIT_BASE || 'origin/main';
    this.headRef = options.headRef || process.env.GIT_HEAD;
    this.includeWorktree = options.includeWorktree ?? !this.headRef;
    this.repoRootPath = options.repoRootPath || path.resolve(__dirname, '../..');
    this.untrackedFiles = new Set();
    this.comparison = null;
  }

  resolveComparison() {
    if (!this.comparison) {
      const resolve = (ref) =>
        this.runGit(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
      const baseSha = resolve(this.baseRef);
      const headSha = resolve(this.headRef || 'HEAD');
      this.runGit(['merge-base', baseSha, headSha]);
      this.comparison = { baseSha, headSha, range: `${baseSha}...${headSha}` };
    }
    return this.comparison;
  }

  read() {
    const { baseSha, headSha } = this.resolveComparison();
    const changedFiles = this.readChangedFiles();
    const currentFiles = this.readCurrentFiles();
    const current = new Set(currentFiles);
    const fileContentsByPath = {};
    for (const file of changedFiles.filter((name) => current.has(name))) {
      fileContentsByPath[file] = this.includeWorktree
        ? fs.readFileSync(path.join(this.repoRootPath, file), 'utf8')
        : this.runGit(['show', `${headSha}:${file}`]);
    }
    return {
      baseSha,
      headSha,
      changedFiles,
      currentFiles,
      fileContentsByPath,
      deletedFiles: changedFiles.filter((name) => !current.has(name)),
      addedLinesByPath: this.readAddedLinesByPath(changedFiles, fileContentsByPath),
    };
  }

  readChangedFiles() {
    const changed = new Set();
    for (const scope of this.diffScopes()) {
      for (const file of this.readGitPaths([
        'diff',
        '--name-only',
        '-z',
        '--no-renames',
        '--diff-filter=ACMRD',
        ...scope,
      ]))
        changed.add(file);
    }
    this.untrackedFiles = new Set(
      !this.includeWorktree
        ? []
        : this.readGitPaths(['ls-files', '--others', '--exclude-standard', '-z'])
    );
    return [...new Set([...changed, ...this.untrackedFiles])].sort();
  }

  readCurrentFiles() {
    if (!this.includeWorktree) {
      return this.readGitPaths([
        'ls-tree',
        '-r',
        '--name-only',
        '-z',
        this.resolveComparison().headSha,
      ]).sort();
    }
    return this.readGitPaths(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
      .filter((name) => fs.existsSync(path.join(this.repoRootPath, name)))
      .sort();
  }

  diffScopes() {
    const committed = [this.resolveComparison().range];
    return this.includeWorktree ? [committed, ['--cached'], []] : [committed];
  }

  readAddedLinesByPath(changedFiles, fileContentsByPath) {
    const result = {};
    for (const scope of this.diffScopes()) {
      const text = this.runGit([
        'diff',
        '--unified=0',
        '--no-ext-diff',
        '--no-renames',
        // Deleted paths remain in the inventory; they have no added lines to read.
        '--diff-filter=ACMR',
        ...scope,
      ]);
      let file = null;
      for (const line of text.split(/\r?\n/)) {
        if (line.startsWith('+++ b/')) {
          file = line.slice(6).replace(/\t$/, '');
          result[file] ||= [];
        } else if (line.startsWith('+++ ')) {
          file = null;
        } else if (file && line.startsWith('+')) {
          result[file].push(line.slice(1));
        }
      }
    }
    for (const name of changedFiles) {
      if (this.untrackedFiles.has(name)) {
        result[name] = fileContentsByPath[name].split(/\r?\n/);
      } else {
        result[name] ||= [];
      }
    }
    return result;
  }

  readGitPaths(args) {
    return this.runGit(args).split('\0').filter(Boolean);
  }

  runGit(args) {
    try {
      return execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
        cwd: this.repoRootPath,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (cause) {
      throw new Error(`Git evidence unavailable: ${args[0]} failed; validation cannot continue.`, {
        cause,
      });
    }
  }
}

module.exports = { FeatureMechanizationGitDiffReader };
