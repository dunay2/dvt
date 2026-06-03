import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const LAYOUT_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasLayoutHandlers.ts'
);

describe('useCanvasLayoutHandlers architecture', () => {
  it('depends on local semantic contracts instead of the parent graph-handlers args', () => {
    expect(LAYOUT_HANDLERS_SOURCE).toContain('CanvasLayoutContracts');
    expect(LAYOUT_HANDLERS_SOURCE).not.toContain('Pick<');
    expect(LAYOUT_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersParams');
    expect(LAYOUT_HANDLERS_SOURCE).not.toContain('UseCanvasGraphHandlersResult');
  });
});
