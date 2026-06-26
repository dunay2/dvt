import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';
import { repoFileExists } from './canvasStartupAndDraftRecovery.architecture.support';

const TAB_STATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasPlaygroundTabState.ts'
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

  it('keeps host tab state semantic while retiring the fixed visual tab-strip surface', () => {
    for (const retiredPath of [
      'apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.tsx',
      'apps/web/src/app/views/canvas/CanvasPlaygroundTabStrip.templates.tsx',
      'apps/web/src/app/views/canvas/useCanvasPlaygroundTabStripPresenter.ts',
      'apps/web/src/app/views/canvas/canvasPlaygroundTabStripModel.ts',
    ]) {
      expect(repoFileExists(retiredPath), retiredPath).toBe(false);
    }
  });
});
