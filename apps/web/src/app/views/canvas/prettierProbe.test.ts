import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as prettier from 'prettier';
import { describe, it } from 'vitest';

describe('temporary Prettier probe', () => {
  it('prints the exact formatting delta for the arithmetic projection file', async () => {
    const relative = 'src/app/views/canvas/canvasDvtSubstraitProjection.ts';
    const source = readFileSync(relative, 'utf8');
    const formatted = await prettier.format(source, {
      filepath: relative,
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      arrowParens: 'always',
      endOfLine: 'lf',
      bracketSpacing: true,
      proseWrap: 'always',
    });
    const target = join(tmpdir(), 'canvasDvtSubstraitProjection.formatted.ts');
    writeFileSync(target, formatted);
    const result = spawnSync('diff', ['-u', relative, target], { encoding: 'utf8' });
    if (result.stdout.length > 0) throw new Error(result.stdout);
  });
});
