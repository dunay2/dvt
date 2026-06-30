/**
 * @ownedConcern Prevent web architecture tests from using raw intake files as
 * semantic proof now that governed meaning must come from canonical sources.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  hasRawIntakePathReference,
  listWebVitestFiles,
  webRoot,
} from './vitestSuites.architecture.support';

describe('web architecture raw-intake guard', () => {
  it('keeps web architecture tests from using raw intake files as semantic proof', () => {
    const architectureFiles = listWebVitestFiles().filter((filePath) =>
      filePath.includes('.architecture.test.')
    );

    expect(architectureFiles.length).toBeGreaterThan(0);

    for (const filePath of architectureFiles) {
      const source = readFileSync(resolve(webRoot, filePath), 'utf8');

      expect(hasRawIntakePathReference(source), filePath).toBe(false);
    }
  });

  it('matches raw intake references when path segments are passed separately', () => {
    const rawIntakeDirectoryName = ['buz', 'on'].join('');

    expect(
      hasRawIntakePathReference(
        `readRepoFile('..', '..', '${rawIntakeDirectoryName}', 'example.md')`
      )
    ).toBe(true);
    expect(hasRawIntakePathReference(`readRepoFile('${rawIntakeDirectoryName}/example.md')`)).toBe(
      true
    );
  });
});
