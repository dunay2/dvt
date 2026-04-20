import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPOSITORY_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'canvasDraftRepository.ts'),
  'utf8'
);

describe('canvasDraftRepository architecture', () => {
  it('delegates save result resolution to dedicated helpers instead of keeping one monolithic branch chain', () => {
    expect(REPOSITORY_SOURCE).toContain('resolveCanvasDraftSaveResult');
    expect(REPOSITORY_SOURCE).toContain('buildSavedCanvasDraftResult');
    expect(REPOSITORY_SOURCE).toContain('resolveCanvasDraftConflictResult');
    expect(REPOSITORY_SOURCE).toContain('throwCanvasDraftSaveFailure');
  });
});
