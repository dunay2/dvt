#!/usr/bin/env node
/** Owned concern: explicitly synchronize admitted source comments without changing executable code. */
const fs = require('node:fs');
const path = require('node:path');
const {
  readComponentSourceResponsibilities,
} = require('./lib/component-source-responsibilities-reader.cjs');
const {
  synchronizeSourceResponsibilityHeader,
} = require('./lib/component-source-responsibilities.cjs');

async function synchronizeComponentSourceHeaders(options = {}) {
  if (options.headRef || process.env.GIT_HEAD) {
    throw new Error(
      'Source synchronization requires the worktree; remove explicit GIT_HEAD selection.'
    );
  }
  const repoRootPath = fs.realpathSync(options.repoRootPath || path.resolve(__dirname, '..'));
  const result = await (options.read || readComponentSourceResponsibilities)({
    ...options,
    repoRootPath,
  });
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  const seen = new Set();
  const plan = result.files.map((file) => {
    if (
      typeof file.path !== 'string' ||
      file.path.includes('\\') ||
      file.path.split('/').some((part) => !part || part === '.' || part === '..') ||
      path.isAbsolute(file.path)
    ) {
      throw new Error(`Unsafe source path: ${file.path}`);
    }
    if (seen.has(file.path)) throw new Error(`Duplicate source path: ${file.path}`);
    seen.add(file.path);
    const target = path.resolve(repoRootPath, file.path);
    const relative = path.relative(repoRootPath, target);
    if (
      relative.startsWith('..') ||
      path.isAbsolute(relative) ||
      fs.lstatSync(target).isSymbolicLink() ||
      fs.realpathSync(target) !== target
    ) {
      throw new Error(`Unsafe source path: ${file.path}`);
    }
    if (!fs.statSync(target).isFile() || fs.readFileSync(target, 'utf8') !== file.content) {
      throw new Error(`Source changed during synchronization: ${file.path}`);
    }
    return {
      ...file,
      target,
      next: synchronizeSourceResponsibilityHeader(file.content, file.header),
    };
  });
  // Build and validate the complete plan before the first write. Recheck all snapshots
  // together so an invalid later file cannot leave earlier files partially synchronized.
  for (const file of plan) {
    if (fs.readFileSync(file.target, 'utf8') !== file.content) {
      throw new Error(`Source changed during synchronization: ${file.path}`);
    }
  }
  const changedFiles = [];
  for (const file of plan) {
    if (!file.next.changed) continue;
    fs.writeFileSync(file.target, file.next.content, 'utf8');
    changedFiles.push(file.path);
  }
  return { changedFiles, fileCount: plan.length };
}

async function main(argv = process.argv.slice(2)) {
  if (argv.length)
    throw new Error(
      'architecture:headers:sync accepts no arguments; scope comes from Planning DB.'
    );
  const result = await synchronizeComponentSourceHeaders();
  console.log(
    `[architecture:headers:sync] ${result.changedFiles.length} changed / ${result.fileCount} admitted files`
  );
  for (const file of result.changedFiles) console.log(`- ${file}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[architecture:headers:sync] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { synchronizeComponentSourceHeaders, main };
