/**
 * @ownedConcern Validate Git changed-file discovery for the web Vitest suite
 * router as an isolated adapter contract.
 */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readChangedFiles, resolveRepositoryRoot } from '../../scripts/run-vitest-changed-suites';

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
