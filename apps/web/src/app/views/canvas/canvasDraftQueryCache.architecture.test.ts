import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CACHE_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'canvasDraftQueryCache.ts'),
  'utf8'
);
const PERSISTENCE_RUNTIME_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'canvasDraftPersistenceRuntime.ts'),
  'utf8'
);
const RELOAD_HYDRATION_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasDraftReloadHydration.ts'),
  'utf8'
);
const RECOVERY_ACTIONS_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'useCanvasDraftRecoveryActions.ts'),
  'utf8'
);
const LIFECYCLE_TYPES_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'canvasDraftLifecycle.types.ts'),
  'utf8'
);

describe('canvasDraftQueryCache architecture', () => {
  it('keeps graph-draft cache key ownership in the dedicated cache seam', () => {
    expect(CACHE_SOURCE).toContain('queryKeys.workspace.graphDraft');
    expect(PERSISTENCE_RUNTIME_SOURCE).not.toContain('queryKeys.workspace.graphDraft');
    expect(RELOAD_HYDRATION_SOURCE).not.toContain('queryKeys.workspace.graphDraft');
    expect(RECOVERY_ACTIONS_SOURCE).not.toContain('queryKeys.workspace.graphDraft');
    expect(LIFECYCLE_TYPES_SOURCE).not.toContain('setQueryData');
  });
});
