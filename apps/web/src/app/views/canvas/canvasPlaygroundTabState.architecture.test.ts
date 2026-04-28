import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const TAB_STATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasPlaygroundTabState.ts'
);
const TAB_STRIP_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasPlaygroundTabStrip.tsx'
);
const TAB_STRIP_TEMPLATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasPlaygroundTabStrip.templates.tsx'
);

describe('canvasPlaygroundTabState architecture', () => {
  it('keeps host tab state as a draft-backed semantic seam instead of controller or JSX transport', () => {
    expect(TAB_STATE_SOURCE).toContain(
      'Owned concern: derive host-visible Canvas tab state from the authoritative workspace draft.'
    );
    expect(TAB_STATE_SOURCE).toContain('export type CanvasPlaygroundTabState');
    expect(TAB_STATE_SOURCE).toContain('WORKSPACE_DRAFT_CANVAS_TAB_ID');
    expect(TAB_STATE_SOURCE).toContain("source: 'workspace_draft'");
    expect(TAB_STATE_SOURCE).not.toContain("'./useCanvasController'");
    expect(TAB_STATE_SOURCE).not.toContain('<Tabs');
    expect(TAB_STATE_SOURCE).not.toContain('ReactNode');
  });

  it('renders the host tab strip from the semantic tab-state contract rather than route/controller props', () => {
    expect(TAB_STRIP_SOURCE).toContain(
      'Owned concern: coordinate host-owned Canvas tabs and replacement action state.'
    );
    expect(TAB_STRIP_SOURCE).toContain('CanvasPlaygroundTabState');
    expect(TAB_STRIP_SOURCE).toContain('CanvasPlaygroundTabStripTemplate');
    expect(TAB_STRIP_TEMPLATE_SOURCE).toContain('canvas-playground-tab-strip');
    expect(TAB_STRIP_SOURCE).not.toContain("'./useCanvasController'");
    expect(TAB_STRIP_SOURCE).not.toContain('WorkspaceGraphDraft');
  });
});
