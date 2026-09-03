import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('canvas authoring projection component architecture', () => {
  it('contains no VTX1 recipe, SQL mirror, or visual SQL compiler production authority', () => {
    const retiredFiles = [
      'DvtVisualTransformRecipeAuthoringSection.tsx',
      'canvasTransformationSqlMirror.ts',
      'canvasVisualTransformSql.ts',
      'canvasVisualTransformSqlCompiler.ts',
    ];
    for (const fileName of retiredFiles) {
      expect(existsSync(path.resolve(import.meta.dirname, fileName))).toBe(false);
    }

    const productionSource = readdirSync(import.meta.dirname)
      .filter((fileName) => /\.(ts|tsx)$/.test(fileName) && !fileName.includes('.test.'))
      .map((fileName) => readFileSync(path.resolve(import.meta.dirname, fileName), 'utf8'))
      .join('\n');
    expect(productionSource).not.toMatch(
      /VisualTransformRecipeV1|canvasTransformationSqlMirror|canvasVisualTransformSqlCompiler/
    );
  });
});
