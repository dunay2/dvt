/** Owned concern: exercise unused-declaration enforcement through the canonical syntax lint profile. */
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({
  cwd: resolve(import.meta.dirname, '../../../..'),
  overrideConfigFile: resolve(
    import.meta.dirname,
    '../../../../tools/ci/eslint-precommit.config.cjs'
  ),
});
const filePath = 'apps/web/src/testing/webUnusedDeclarations.architecture.test.ts';

describe('web unused declarations', () => {
  it.each([
    'const unconsumed = 1; export const consumed = 2;',
    'import type { ReactNode } from "react"; export const consumed = 2;',
  ])(
    'rejects unconsumed declarations using canonical syntax lint: %s',
    async (source) => {
      const [result] = await eslint.lintText(source, { filePath });
      expect(result?.fatalErrorCount).toBe(0);
      expect(result?.messages).toContainEqual(
        expect.objectContaining({ ruleId: '@typescript-eslint/no-unused-vars', severity: 2 })
      );
    },
    30_000
  );

  it('does not classify public exports or effectful calls as dead declarations', async () => {
    const [result] = await eslint.lintText('export const consumed = 2; console.info(consumed);', {
      filePath,
    });
    expect(result?.messages).toEqual([]);
  }, 30_000);
});
