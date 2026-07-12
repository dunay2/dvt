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
        if (args.join(' ') === 'diff --name-only --diff-filter=ACMR origin/release merge-sha') {
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

  it('falls back to merge-base diffing when the direct CI range is unavailable', () => {
    const files = readChangedFiles('/repo', {
      env: { GIT_BASE: 'origin/main', GIT_HEAD: 'HEAD' },
      gitOutput(args) {
        const command = args.join(' ');
        if (command === 'diff --name-only --diff-filter=ACMR origin/main HEAD') {
          throw new Error('base ref not fetched as a diffable object');
        }
        if (command === 'merge-base origin/main HEAD') {
          return ['base-sha'];
        }
        if (command === 'diff --name-only --diff-filter=ACMR base-sha HEAD') {
          return ['apps/web/src/app/views/canvas/canvasDraftScope.test.ts'];
        }
        return [];
      },
    });

    expect(files).toEqual(['apps/web/src/app/views/canvas/canvasDraftScope.test.ts']);
  });
});
