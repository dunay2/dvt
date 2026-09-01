import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeWorkbenchDraftController.ts'
);
const PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasNodeWorkbenchPanel.tsx'
);
const AUTHORING_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasInspectorAuthoringSection.tsx'
);

describe('Canvas node workbench draft controller architecture', () => {
  it('keeps transient draft reconciliation outside presentation components', () => {
    expect(CONTROLLER_SOURCE).toContain(
      'Owned concern: reconcile one authoritative selected node with one transient workbench draft.'
    );
    expect(CONTROLLER_SOURCE).toContain('authority-received');
    expect(CONTROLLER_SOURCE).toContain('draft-submitted');
    expect(CONTROLLER_SOURCE).toContain('reset-requested');
    expect(CONTROLLER_SOURCE).not.toContain('onApplyNodeDraft');
    expect(CONTROLLER_SOURCE).not.toContain('canvasDraftSession');
    expect(CONTROLLER_SOURCE).not.toContain('workspaceService');
    expect(CONTROLLER_SOURCE).not.toContain('DbtAuthoringFields');
    expect(CONTROLLER_SOURCE).not.toContain('DvtAuthoringFields');

    expect(PANEL_SOURCE).toContain(
      'useCanvasNodeWorkbenchDraftController(node, authoring.workspaceScope)'
    );
    expect(PANEL_SOURCE).not.toContain('authoritativeNodeRef');
    expect(PANEL_SOURCE).not.toContain('authoritativeDraftRef');
    expect(PANEL_SOURCE).not.toContain('authoringSourceFingerprint');

    expect(AUTHORING_SECTION_SOURCE).toContain(
      'import type { CanvasNodeWorkbenchDraftController }'
    );
    expect(AUTHORING_SECTION_SOURCE).toContain('authoring.onApplyNodeDraft(draft)');
    expect(AUTHORING_SECTION_SOURCE).toContain('draftController.onDraftSubmitted(draft)');
    expect(AUTHORING_SECTION_SOURCE).not.toContain('useState(');
    expect(AUTHORING_SECTION_SOURCE).not.toContain('createCanvasInspectorNodeDraft');
  });
});
