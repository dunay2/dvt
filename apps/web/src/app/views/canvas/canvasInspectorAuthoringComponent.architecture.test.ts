import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasInspectorAuthoring.types.ts'
);
const MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasInspectorAuthoringModel.ts'
);
const COMMAND_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasInspectorAuthoringCommand.ts'
);
const HOOK_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasInspectorCommands.ts'
);
const SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasInspectorAuthoringSection.tsx'
);
const PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasInspectorPanel.tsx'
);

describe('canvas inspector authoring component architecture', () => {
  it('keeps DTO, model, command, hook, and route-owned view seams explicitly separated', () => {
    expect(TYPES_SOURCE).toContain(
      'Owned concern: declare the semantic DTO and route-owned contract for Canvas Inspector authoring.'
    );
    expect(TYPES_SOURCE).toContain('export type CanvasInspectorNodeDraft');
    expect(TYPES_SOURCE).toContain('export type CanvasInspectorAuthoringContract');

    expect(MODEL_SOURCE).toContain(
      'Owned concern: derive, validate, and apply the route-owned Inspector DTO'
    );
    expect(MODEL_SOURCE).toContain('createCanvasInspectorNodeDraft');
    expect(MODEL_SOURCE).toContain('validateCanvasInspectorNodeDraft');
    expect(MODEL_SOURCE).toContain('applyCanvasInspectorNodeDraft');
    expect(MODEL_SOURCE).not.toContain("from 'react'");
    expect(MODEL_SOURCE).not.toContain('workspaceService');

    expect(COMMAND_SOURCE).toContain(
      'Owned concern: apply validated route-owned Inspector drafts back into the Canvas draft aggregate.'
    );
    expect(COMMAND_SOURCE).toContain('canvasDraftSession.workingSet.upsertNode');
    expect(COMMAND_SOURCE).not.toContain("from 'react'");
    expect(COMMAND_SOURCE).not.toContain('useState(');

    expect(HOOK_SOURCE).toContain(
      'Owned concern: expose route-owned Inspector mutation commands over the Canvas draft aggregate.'
    );
    expect(HOOK_SOURCE).toContain('applyCanvasInspectorNodeDraftToSession');
    expect(HOOK_SOURCE).not.toContain('workspaceService');

    expect(SECTION_SOURCE).toContain(
      'Owned concern: render the route-owned Inspector authoring surface for governed node details.'
    );
    expect(SECTION_SOURCE).toContain('createCanvasInspectorNodeDraft');
    expect(SECTION_SOURCE).not.toContain('useCanvasController');
    expect(SECTION_SOURCE).not.toContain('workspaceService');

    expect(PANEL_SOURCE).toContain(
      'Owned concern: compose the passive Inspector view with the route-owned Inspector authoring surface.'
    );
    expect(PANEL_SOURCE).toContain('CanvasInspectorAuthoringSection');
    expect(PANEL_SOURCE).toContain('InspectorPanel');
  });
});
