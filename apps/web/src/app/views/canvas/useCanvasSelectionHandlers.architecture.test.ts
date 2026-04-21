import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const SELECTION_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasSelectionHandlers.ts'
);

describe('useCanvasSelectionHandlers architecture', () => {
  it('depends on local semantic contracts instead of the parent graph-handlers args', () => {
    expect(SELECTION_HANDLERS_SOURCE).toContain('CanvasSelectionContracts');
    expect(SELECTION_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(SELECTION_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersParams');
    expect(SELECTION_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersResult');
  });
});
