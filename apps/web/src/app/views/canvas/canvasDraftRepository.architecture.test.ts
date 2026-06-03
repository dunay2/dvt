import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const REPOSITORY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftRepository.ts'
);

describe('canvasDraftRepository architecture', () => {
  it('delegates save result resolution to dedicated helpers instead of keeping one monolithic branch chain', () => {
    expect(REPOSITORY_SOURCE).toContain('resolveCanvasDraftSaveResult');
    expect(REPOSITORY_SOURCE).toContain('buildSavedCanvasDraftResult');
    expect(REPOSITORY_SOURCE).toContain('resolveCanvasDraftConflictResult');
    expect(REPOSITORY_SOURCE).toContain('throwCanvasDraftSaveFailure');
  });
});
