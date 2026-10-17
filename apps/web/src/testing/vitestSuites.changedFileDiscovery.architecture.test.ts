/**
 * @ownedConcern Validate Git changed-file discovery for the web Vitest suite
 * router as an isolated adapter contract.
 */
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import {
  readBrowserCatalogSnapshots,
  readChangedFiles,
  resolveRepositoryRoot,
} from '../../scripts/run-vitest-changed-suites';
import { WEB_CYPRESS_CATALOG_PATH, WEB_CYPRESS_SPECS } from '../../cypress.catalog';
import { resolveControlledCatalogAdditions } from '../../cypress.catalog';

describe('web Vitest changed-file discovery', () => {
  it('resolves the repository from the runner location instead of the inherited hook cwd', () => {
    const scriptPath = resolve('/repo', 'apps/web/scripts/run-vitest-changed-suites.ts');

    expect(resolveRepositoryRoot(scriptPath)).toBe(resolve('/repo'));
  });

  it('uses the CI-provided base and head refs without requiring a merge base', () => {
    const calls: string[] = [];
    const files = readChangedFiles('/repo', {
      env: { GIT_BASE: 'origin/release', GIT_HEAD: 'merge-sha' },
      gitOutput(args) {
        calls.push(args.join(' '));
        if (args.join(' ') === 'diff --name-only --no-renames -z origin/release merge-sha') {
          return ['apps/web/src/app/views/canvas/CanvasToolbar.tsx'];
        }
        if (args[0] === 'merge-base') {
          throw new Error('shallow checkout has no merge base');
        }
        return [];
      },
    });

    expect(files).toEqual(['apps/web/src/app/views/canvas/CanvasToolbar.tsx']);
    expect(calls).not.toContain('merge-base origin/release merge-sha');
  });

  it.each(['range', 'index', 'working tree', 'untracked'])(
    'fails closed when Git cannot read %s',
    (failed) => {
      expect(() =>
        readChangedFiles('/repo', {
          env: { GIT_BASE: 'missing', GIT_HEAD: 'candidate' },
          gitOutput(args) {
            const stage =
              args[0] === 'ls-files'
                ? 'untracked'
                : args.includes('--cached')
                  ? 'index'
                  : args.includes('candidate')
                    ? 'range'
                    : 'working tree';
            if (stage === failed) throw new Error(`unreadable ${stage}`);
            return [];
          },
        })
      ).toThrow(`unreadable ${failed}`);
    }
  );

  it('retains deleted paths and combines range, index, working tree and untracked changes', () => {
    const files = readChangedFiles('/repo', {
      env: {},
      gitOutput(args) {
        if (args[0] === 'ls-files') return ['new.ts'];
        expect(args.some((arg) => arg.startsWith('--diff-filter'))).toBe(false);
        expect(args).toContain('--no-renames');
        return args.includes('--cached')
          ? ['staged.ts']
          : args.includes('HEAD')
            ? ['deleted.cy.ts', 'type-changed.cy.ts', 'source.ts']
            : ['source.ts'];
      },
    });
    expect(files).toEqual([
      'deleted.cy.ts',
      'new.ts',
      'source.ts',
      'staged.ts',
      'type-changed.cy.ts',
    ]);
  });
});

describe('Browser catalog Git snapshots', () => {
  const base = { ...WEB_CYPRESS_SPECS, controlled: WEB_CYPRESS_SPECS.controlled.slice(0, -1) };
  function gitOutput(args: readonly string[]): string[] {
    if (args[0] === 'rev-parse') return [args.at(-1) === 'base^{commit}' ? 'base-sha' : 'head-sha'];
    if (args[0] === 'ls-tree') return [WEB_CYPRESS_CATALOG_PATH];
    if (args[0] === 'show')
      return [JSON.stringify(args[1]!.startsWith('base-sha:') ? base : WEB_CYPRESS_SPECS)];
    return [];
  }

  it('uses verified base/head blobs, not the inherited working directory', () => {
    const calls: string[][] = [];
    const result = readBrowserCatalogSnapshots('/repo', {
      env: { GIT_BASE: 'base', GIT_HEAD: 'head' },
      gitOutput(args, cwd) {
        expect(cwd).toBe('/repo');
        calls.push([...args]);
        return gitOutput(args);
      },
    });
    expect(result).toEqual({ base, head: WEB_CYPRESS_SPECS });
    expect(calls).toContainEqual(['show', `base-sha:${WEB_CYPRESS_CATALOG_PATH}`]);
    expect(calls).toContainEqual(['show', `head-sha:${WEB_CYPRESS_CATALOG_PATH}`]);
  });

  it.each(['index', 'working tree', 'untracked'])(
    'cannot narrow with a dirty %s catalog',
    (dirty) => {
      const result = readBrowserCatalogSnapshots('/repo', {
        gitOutput(args) {
          if (
            (dirty === 'index' && args.includes('--cached')) ||
            (dirty === 'working tree' && args[0] === 'diff' && !args.includes('--cached')) ||
            (dirty === 'untracked' && args[0] === 'ls-files')
          )
            return [WEB_CYPRESS_CATALOG_PATH];
          return gitOutput(args);
        },
      });
      expect(result).toBeUndefined();
    }
  );

  it('keeps a missing base catalog explicit rather than inventing an empty baseline', () => {
    expect(
      readBrowserCatalogSnapshots('/repo', {
        env: { GIT_BASE: 'base' },
        gitOutput(args) {
          return args[0] === 'ls-tree' && args.includes('base-sha') ? [] : gitOutput(args);
        },
      })
    ).toEqual({ base: null, head: WEB_CYPRESS_SPECS });
  });

  it.each(['rev-parse', 'diff', 'ls-tree', 'show'])(
    'propagates unreadable Git evidence from %s',
    (command) => {
      expect(() =>
        readBrowserCatalogSnapshots('/repo', {
          gitOutput(args) {
            if (args[0] === command) throw new Error(`unreadable ${command}`);
            return gitOutput(args);
          },
        })
      ).toThrow(`unreadable ${command}`);
    }
  );

  it('reads real committed catalog blobs and rejects index divergence in an isolated repository', () => {
    const require = createRequire(import.meta.url);
    const { createGitRepositoryEnvironment } =
      require('../../../../scripts/lib/git-repository-environment.cjs') as {
        createGitRepositoryEnvironment: () => NodeJS.ProcessEnv;
      };
    const environment = {
      ...createGitRepositoryEnvironment(),
      GIT_AUTHOR_NAME: 'Catalog fixture',
      GIT_AUTHOR_EMAIL: 'catalog@example.invalid',
      GIT_COMMITTER_NAME: 'Catalog fixture',
      GIT_COMMITTER_EMAIL: 'catalog@example.invalid',
    };
    const root = mkdtempSync(resolve(tmpdir(), 'dvt-browser-catalog-'));
    const runGit = (args: readonly string[]): string =>
      execFileSync('git', [...args], {
        cwd: root,
        env: environment,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    const runGitPaths = (args: readonly string[]): string[] =>
      runGit(args).split('\0').filter(Boolean);
    const writeCatalog = (value: unknown): void =>
      writeFileSync(resolve(root, WEB_CYPRESS_CATALOG_PATH), JSON.stringify(value));
    const commit = (parent?: string): string => {
      runGit(['add', '--', WEB_CYPRESS_CATALOG_PATH]);
      const tree = runGit(['write-tree']).trim();
      const sha = runGit([
        'commit-tree',
        tree,
        ...(parent ? ['-p', parent] : []),
        '-m',
        'Catalog fixture',
      ]).trim();
      runGit(['update-ref', 'HEAD', sha]);
      return sha;
    };
    try {
      runGit(['init', '--quiet', '--initial-branch=main']);
      mkdirSync(resolve(root, 'apps/web'), { recursive: true });
      writeCatalog(base);
      const baseSha = commit();
      writeCatalog(WEB_CYPRESS_SPECS);
      const headSha = commit(baseSha);
      const options = { env: { GIT_BASE: baseSha, GIT_HEAD: headSha }, gitOutput: runGitPaths };
      const snapshots = readBrowserCatalogSnapshots(root, options);
      expect(snapshots).toEqual({ base, head: WEB_CYPRESS_SPECS });
      expect(resolveControlledCatalogAdditions(WEB_CYPRESS_SPECS, snapshots)).toEqual([
        WEB_CYPRESS_SPECS.controlled.at(-1),
      ]);
      writeCatalog(base);
      runGit(['add', '--', WEB_CYPRESS_CATALOG_PATH]);
      writeCatalog(WEB_CYPRESS_SPECS);
      expect(readBrowserCatalogSnapshots(root, options)).toBeUndefined();
      expect(runGit(['rev-parse', 'HEAD']).trim()).toBe(headSha);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
