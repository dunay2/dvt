import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import * as prettier from 'prettier';
import { describe, it } from 'vitest';

const files = [
  'src/app/views/canvas/CanvasDerivedOutputSection.test.tsx',
  'src/app/views/canvas/CanvasDerivedOutputSection.tsx',
  'src/app/views/canvas/DerivedExpressionBuilder.tsx',
  'src/app/views/canvas/DerivedExpressionNodeEditor.tsx',
  'src/app/views/canvas/DerivedOutputForm.tsx',
  'src/app/views/canvas/canvasSelectedRelationDerivedOutput.test.ts',
  'src/app/views/canvas/canvasSelectedRelationDerivedOutput.ts',
  'src/app/plugins/graph/GraphNodeExpressionComposer.tsx',
] as const;

describe('temporary Formula Builder Prettier probe', () => {
  it('prints exact formatting deltas', async () => {
    const deltas: string[] = [];
    for (const relative of files) {
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
      if (formatted === source) continue;
      const target = join(tmpdir(), `formatted-${basename(relative)}`);
      writeFileSync(target, formatted);
      const result = spawnSync('diff', ['-u', relative, target], { encoding: 'utf8' });
      deltas.push(`### ${relative}\n${result.stdout}`);
    }
    if (deltas.length > 0) throw new Error(deltas.join('\n'));
  });
});
