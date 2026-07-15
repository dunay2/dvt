/** Owned concern: keep browser-proof artifacts outside Vite's application reload boundary. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

describe('Vite Cypress artifact isolation', () => {
  it.each(['downloads', 'screenshots', 'videos'])(
    'ignores Cypress %s artifacts instead of reloading the application under test',
    (artifactDirectory) => {
      expect(viteConfig).toContain(`**/cypress/${artifactDirectory}/**`);
    }
  );
});
