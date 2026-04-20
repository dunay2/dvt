import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CACHE_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'canvasDraftQueryCache.ts');
const PERSISTENCE_RUNTIME_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftPersistenceRuntime.ts'
);
const RELOAD_HYDRATION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftReloadHydration.ts'
);
const RECOVERY_ACTIONS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasDraftRecoveryActions.ts'
);
const LIFECYCLE_TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftLifecycle.types.ts'
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
