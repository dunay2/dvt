/** Owned concern: run real docs CLIs without changing the working repository. */
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const tsxLoader = pathToFileURL(require.resolve('tsx')).href;

export function runDocsCommand(script, args = [], options = {}) {
  const root = options.root ?? repositoryRoot;
  const result = spawnSync(process.execPath, ['--import', tsxLoader, join(root, script), ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  return { ...result, output: result.stdout + '\n' + result.stderr };
}

export function createDocsRepository(t) {
  const root = mkdtempSync(join(tmpdir(), 'dvt-docs-cli-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(repositoryRoot, 'tools/docs'), join(root, 'tools/docs'), { recursive: true });
  mkdirSync(join(root, 'scripts'));
  for (const script of ['git-local-changes.cjs', 'check-markdown-locations.cjs']) {
    cpSync(join(repositoryRoot, 'scripts', script), join(root, 'scripts', script));
  }
  cpSync(join(repositoryRoot, 'package.json'), join(root, 'package.json'));
  symlinkSync(join(repositoryRoot, 'node_modules'), join(root, 'node_modules'), 'junction');
  const write = (name, content) => {
    const target = resolve(root, name);
    if (!target.startsWith(root + sep)) throw new Error('Fixture path escapes its repository');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf8');
  };
  return {
    root,
    write,
    read: (name) => readFileSync(join(root, name), 'utf8'),
    run: (script, args, changedFiles) =>
      runDocsCommand(script, args, {
        root,
        env: { DOCS_GOV_CHANGED_FILES: changedFiles.join(';') },
      }),
  };
}

export const validEvidence = [
  '---',
  'title: Frontmatter fixture',
  'status: Accepted',
  'date: 2099-12-31',
  'owners: [docs]',
  'arc_level: ARC-1',
  'breaking: false',
  'code_refs: [tools/docs/check-frontmatter.ts]',
  'evidence:',
  '  tests: [pnpm test:ci-tools]',
  '---',
  '# Frontmatter fixture',
  '',
].join('\n');
