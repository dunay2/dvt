import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const TOOLBAR_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'CanvasToolbar.tsx');
const TOOLBAR_PRIMARY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasToolbarPrimaryControls.tsx'
);
const VIEW_MENU_CONTROLS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasViewMenuControls.tsx'
);
const VIEW_MENU_STORE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasViewMenuContributionStore.ts'
);
const SHELL_MENU_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/ShellMenu.tsx'
);
const COMPONENT_GUIDE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/canvas-view-menu-component.md'
);

describe('CanvasToolbar architecture', () => {
  it('stays a thin composition seam over dedicated toolbar helpers', () => {
    expect(TOOLBAR_SOURCE).toContain("'./CanvasToolbarPrimaryControls'");
    expect(TOOLBAR_SOURCE).toContain("'./CanvasToolbarDraftStatus'");
    expect(TOOLBAR_SOURCE).toContain("'./canvasToolbarViewModel'");
    expect(TOOLBAR_SOURCE).toContain("'./CanvasViewMenuControls'");
    expect(TOOLBAR_SOURCE).not.toContain('createPortal');
    expect(TOOLBAR_SOURCE).not.toContain('useCanvasToolbarPortalTarget');
    expect(TOOLBAR_SOURCE).not.toContain("placement?: 'inline' | 'top-bar'");
    expect(TOOLBAR_SOURCE).not.toContain('resolveWorkflowStatusLabel');
    expect(TOOLBAR_SOURCE).not.toContain('resolveWorkflowStatusClass');
  });

  it('keeps Canvas view controls in the View menu contribution instead of the top-bar toolbar', () => {
    expect(VIEW_MENU_CONTROLS_SOURCE).toContain(
      'Owned concern: render Canvas-specific visual controls inside the shell View menu.'
    );
    expect(VIEW_MENU_STORE_SOURCE).toContain(
      'Owned concern: hold the active Canvas route contribution to the shell View menu.'
    );
    expect(SHELL_MENU_SOURCE).toContain('CanvasViewMenuControls');

    for (const viewOwnedLabel of [
      'toolbarLayoutLabel',
      'toolbarImpactLabel',
      'toolbarColumnsLabel',
      'toolbarCostLabel',
      'toolbarGridLabel',
      'toolbarGridColorLabel',
      'toolbarSnapToGridLabel',
    ]) {
      expect(VIEW_MENU_CONTROLS_SOURCE).toContain(viewOwnedLabel);
      expect(TOOLBAR_PRIMARY_SOURCE).not.toContain(viewOwnedLabel);
    }
  });

  it('documents Canvas View menu API, invariants, transitions, consumers, and diagrams', () => {
    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '```mermaid',
    ]) {
      expect(COMPONENT_GUIDE_SOURCE).toContain(requiredSection);
    }
  });
});
