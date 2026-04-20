import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const TOOLBAR_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'CanvasToolbar.tsx');

describe('CanvasToolbar architecture', () => {
  it('stays a thin composition seam over dedicated toolbar helpers', () => {
    expect(TOOLBAR_SOURCE).toContain("'./CanvasToolbarPrimaryControls'");
    expect(TOOLBAR_SOURCE).toContain("'./CanvasToolbarDraftStatus'");
    expect(TOOLBAR_SOURCE).toContain("'./canvasToolbarViewModel'");
    expect(TOOLBAR_SOURCE).toContain("'./useCanvasToolbarPortalTarget'");
    expect(TOOLBAR_SOURCE).not.toContain('resolveWorkflowStatusLabel');
    expect(TOOLBAR_SOURCE).not.toContain('resolveWorkflowStatusClass');
  });
});
