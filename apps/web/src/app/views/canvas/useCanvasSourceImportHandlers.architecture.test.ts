import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const SOURCE_IMPORT_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasSourceImportHandlers.ts'
);

describe('useCanvasSourceImportHandlers architecture', () => {
  it('depends on local semantic contracts instead of the parent mutation-handlers args', () => {
    expect(SOURCE_IMPORT_HANDLERS_SOURCE).toContain('CanvasSourceImportContracts');
    expect(SOURCE_IMPORT_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(SOURCE_IMPORT_HANDLERS_SOURCE).not.toContain('UseCanvasMutationHandlersArgs');
  });
});
