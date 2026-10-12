/** Owned concern: keep source reference resolution shared by UI and protected selection. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('source instance authority', () => {
  it('uses the shared secure identity primitive without a browser-only UUID API', () => {
    const path = 'canvasSourceInstance.ts';
    const text = readFileSync(new URL(path, import.meta.url), 'utf8');
    expect(text).toContain("import { randomUuidV4 } from '@dvt/crypto'");
    expect(text).toContain('id: string = randomUuidV4()');
    expect(text).not.toContain('crypto.randomUUID');
    expect(text).not.toContain('Math.random');
  });

  it('uses the shared resolver in projection and protected preview', () => {
    for (const path of [
      '../../services/workspace/workspaceGraphDraftProjection.ts',
      'canvasAuthoringGraphProjection.ts',
      '../../../../../api/src/application/services/dvtProtectedTransformSelection.ts',
    ]) {
      const text = readFileSync(new URL(path, import.meta.url), 'utf8');
      expect(text).toContain('resolveWorkspaceSourceInstances');
    }
  });
});
