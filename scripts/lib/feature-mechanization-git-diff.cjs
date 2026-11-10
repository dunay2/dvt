/**
 * Owned concern: acquire real Git candidate evidence without success fallbacks.
 * Why: selected source acquisition must not launch a process for every unchanged binding.
 * Corner: bounded batches retain exact snapshot content and reject incomplete or nonblob evidence.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const MAX_GIT_BYTES = 32 * 1024 * 1024;
const MAX_BATCH_BYTES = 4 * 1024 * 1024;
const MAX_BATCH_OBJECTS = 128;

class FeatureMechanizationGitDiffReader {
  constructor(options = {}) {
    this.baseRef = options.baseRef || process.env.GIT_BASE || 'origin/main';
    this.headRef = options.headRef || process.env.GIT_HEAD;
    this.includeWorktree = options.includeWorktree ?? !this.headRef;
    this.repoRootPath = options.repoRootPath || path.resolve(__dirname, '../..');
    this.untrackedFiles = new Set();
    this.comparison = null;
    this.currentFiles = null;
    this.currentFileSet = null;
    this.blobs = new Map();
    this.sourceContents = new Map();
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
    this.readSources(changedFiles.filter((name) => current.has(name)));
    for (const file of changedFiles.filter((name) => current.has(name))) {
      fileContentsByPath[file] = this.readSource(file);
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
    if (this.currentFiles) return [...this.currentFiles];
    if (!this.includeWorktree) {
      const entries = this.readGitPaths([
        'ls-tree',
        '-r',
        '-l',
        '-z',
        this.resolveComparison().headSha,
      ]);
      this.currentFiles = entries
        .map((entry) => {
          const separator = entry.indexOf('\t');
          const metadata = /^\d{6} ([a-z]+) ([a-f0-9]{40}|[a-f0-9]{64}) +(-|\d+)$/.exec(
            entry.slice(0, separator)
          );
          if (separator < 0 || !metadata)
            throw new Error('Git evidence unavailable: invalid selected tree entry.');
          const name = entry.slice(separator + 1);
          this.blobs.set(name, { type: metadata[1], oid: metadata[2], size: Number(metadata[3]) });
          return name;
        })
        .sort();
    } else {
      this.currentFiles = this.readGitPaths([
        'ls-files',
        '--cached',
        '--others',
        '--exclude-standard',
        '-z',
      ])
        .filter((name) => fs.existsSync(path.join(this.repoRootPath, name)))
        .sort();
    }
    this.currentFileSet = new Set(this.currentFiles);
    return [...this.currentFiles];
  }

  readSource(sourcePath) {
    this.readSources([sourcePath]);
    return this.sourceContents.get(sourcePath);
  }

  readSources(sourcePaths) {
    if (!this.currentFiles) this.readCurrentFiles();
    const selected = [...new Set(sourcePaths)];
    for (const name of selected)
      if (!this.currentFileSet.has(name)) throw new Error('Missing selected Git path: ' + name);
    const pending = selected.filter((name) => !this.sourceContents.has(name));
    if (this.includeWorktree) {
      for (const name of pending)
        this.sourceContents.set(name, fs.readFileSync(path.join(this.repoRootPath, name), 'utf8'));
      return;
    }
    const acquired = new Map();
    let batch = [];
    let bytes = 0;
    const flush = () => {
      if (batch.length === 0) return;
      const output = this.runGit(['cat-file', '--batch'], {
        input: batch.map(({ oid }) => oid).join('\n') + '\n',
        binary: true,
        maxBuffer: Math.max(MAX_GIT_BYTES, bytes + batch.length * 128),
      });
      if (!Buffer.isBuffer(output)) throw new Error('Git blob evidence has invalid framing.');
      let cursor = 0;
      for (const blob of batch) {
        const end = output.indexOf(10, cursor);
        const header = /^([a-f0-9]{40}|[a-f0-9]{64}) blob (\d+)$/.exec(
          end < 0 ? '' : output.subarray(cursor, end).toString('utf8')
        );
        const contentEnd = end + 1 + blob.size;
        if (
          !header ||
          header[1] !== blob.oid ||
          Number(header[2]) !== blob.size ||
          contentEnd >= output.length ||
          output[contentEnd] !== 10
        )
          throw new Error('Git blob evidence is missing, nonblob or incomplete.');
        acquired.set(blob.path, output.subarray(end + 1, contentEnd).toString('utf8'));
        cursor = contentEnd + 1;
      }
      if (cursor !== output.length) throw new Error('Git blob evidence has trailing data.');
      batch = [];
      bytes = 0;
    };
    for (const name of pending) {
      const blob = this.blobs.get(name);
      if (!blob || blob.type !== 'blob' || !Number.isSafeInteger(blob.size) || blob.size < 0)
        throw new Error('Git blob evidence is missing or nonblob.');
      if (blob.size > MAX_GIT_BYTES)
        throw new Error('Git evidence unavailable: blob exceeds 32 MiB.');
      if (batch.length >= MAX_BATCH_OBJECTS || bytes + blob.size > MAX_BATCH_BYTES) flush();
      batch.push({ ...blob, path: name });
      bytes += blob.size;
    }
    flush();
    for (const [name, content] of acquired) this.sourceContents.set(name, content);
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

  runGit(args, options = {}) {
    try {
      return execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
        cwd: this.repoRootPath,
        encoding: options.binary ? null : 'utf8',
        maxBuffer: options.maxBuffer || MAX_GIT_BYTES,
        input: options.input,
        stdio: [options.input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      });
    } catch (cause) {
      throw new Error(`Git evidence unavailable: ${args[0]} failed; validation cannot continue.`, {
        cause,
      });
    }
  }
}

module.exports = { FeatureMechanizationGitDiffReader };
