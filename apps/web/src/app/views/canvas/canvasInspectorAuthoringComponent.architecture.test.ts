import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const TYPES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasInspectorAuthoring.types.ts'
);
const ERROR_CODES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasInspectorAuthoringErrorCodes.ts'
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
const DBT_FIELDS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DbtAuthoringFields.tsx'
);
const DVT_FIELDS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DvtAuthoringFields.tsx'
);
const DVT_SOURCE_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DvtSourceAuthoringSection.tsx'
);
const DVT_SQL_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DvtSqlTransformAuthoringSection.tsx'
);
const DVT_SINK_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DvtSinkAuthoringSection.tsx'
);
const PANEL_SOURCE = readArchitectureSiblingSource(import.meta.dirname, 'CanvasInspectorPanel.tsx');

describe('canvas inspector authoring component architecture', () => {
  it('keeps DTO, model, command, hook, and route-owned view seams explicitly separated', () => {
    expect(TYPES_SOURCE).toContain(
      'Owned concern: declare the semantic DTO and route-owned contract for Canvas Inspector authoring.'
    );
    expect(TYPES_SOURCE).toContain('export type CanvasInspectorNodeDraft');
    expect(TYPES_SOURCE).toContain('export type CanvasInspectorAuthoringContract');
    expect(ERROR_CODES_SOURCE).toContain(
      'Owned concern: declare locale-neutral Inspector authoring validation error codes.'
    );

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
      'Owned concern: orchestrate the route-owned Inspector authoring surface for governed node details.'
    );
    expect(SECTION_SOURCE).toContain('createCanvasInspectorNodeDraft');
    expect(SECTION_SOURCE).toContain('DbtAuthoringFields');
    expect(SECTION_SOURCE).toContain('DvtAuthoringFields');
    expect(SECTION_SOURCE).not.toContain('useCanvasController');
    expect(SECTION_SOURCE).not.toContain('workspaceService');

    expect(DBT_FIELDS_SOURCE).toContain(
      'Owned concern: render dbt-specific Canvas Inspector authoring fields.'
    );
    expect(DBT_FIELDS_SOURCE).toContain('data-slot="dbt-generated-model-sql"');
    expect(DBT_FIELDS_SOURCE).not.toContain('name="dbt-model-sql"');
    expect(DBT_FIELDS_SOURCE).not.toContain('workspaceService');

    expect(DVT_FIELDS_SOURCE).toContain(
      'Owned concern: render DVT-specific Canvas Inspector authoring fields.'
    );
    expect(DVT_FIELDS_SOURCE).toContain('DvtSourceAuthoringSection');
    expect(DVT_FIELDS_SOURCE).toContain('DvtSqlTransformAuthoringSection');
    expect(DVT_FIELDS_SOURCE).toContain('DvtSinkAuthoringSection');
    expect(DVT_SQL_SECTION_SOURCE).toContain('name="dvt-transform-sql"');
    expect(DVT_FIELDS_SOURCE).not.toContain('workspaceService');

    expect(PANEL_SOURCE).toContain(
      'Owned concern: compose the passive Inspector view with the route-owned Inspector authoring surface.'
    );
    expect(PANEL_SOURCE).toContain('CanvasInspectorAuthoringSection');
    expect(PANEL_SOURCE).toContain('InspectorPanel');
  });

  it('keeps Inspector authoring visible copy behind the Canvas i18n catalog', () => {
    expect(SECTION_SOURCE).toContain('canvasViewCopy');
    expect(DBT_FIELDS_SOURCE).toContain('canvasViewCopy');
    expect(DVT_SOURCE_SECTION_SOURCE).toContain('canvasViewCopy');
    expect(DVT_SQL_SECTION_SOURCE).toContain('canvasViewCopy');
    expect(DVT_SINK_SECTION_SOURCE).toContain('canvasViewCopy');
    expect(SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DBT_FIELDS_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DVT_SOURCE_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DVT_SQL_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DVT_SINK_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');

    expect(SECTION_SOURCE).toContain('canvasViewCopy.inspectorEditablePropertiesTitle');
    expect(DBT_FIELDS_SOURCE).toContain('canvasViewCopy.inspectorDbtPackageLabel');
    expect(DBT_FIELDS_SOURCE).toContain('canvasViewCopy.inspectorDbtGeneratedSqlLabel');
    expect(DVT_SINK_SECTION_SOURCE).toContain('canvasViewCopy.inspectorDvtWriteModeLabel');
    expect(ERROR_CODES_SOURCE).toContain('export type CanvasInspectorNodeDraftErrorCode');
    expect(MODEL_SOURCE).not.toContain('canvasViewCopy');
    expect(MODEL_SOURCE).not.toContain('inspectorError');
    expect(MODEL_SOURCE).toContain('node_name_required');
    expect(MODEL_SOURCE).toContain('dbt_package_required');
  });

  it('keeps DVT source, SQL transform, and sink authoring in separate presentation leaves', () => {
    expect(DVT_FIELDS_SOURCE).not.toContain("from '../../components/ui/input'");
    expect(DVT_FIELDS_SOURCE).not.toContain("from '../../components/ui/textarea'");
    expect(DVT_FIELDS_SOURCE).not.toContain('name="dvt-source-schema"');
    expect(DVT_FIELDS_SOURCE).not.toContain('name="dvt-sink-write-mode"');

    expect(DVT_SOURCE_SECTION_SOURCE).toContain(
      'Owned concern: render DVT source authoring fields.'
    );
    expect(DVT_SOURCE_SECTION_SOURCE).toContain('name="dvt-source-schema"');
    expect(DVT_SOURCE_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');

    expect(DVT_SQL_SECTION_SOURCE).toContain(
      'Owned concern: render DVT SQL transform authoring fields.'
    );
    expect(DVT_SQL_SECTION_SOURCE).toContain('name="dvt-transform-sql"');
    expect(DVT_SQL_SECTION_SOURCE).toContain('inspectorDvtSqlLinePluralLabel');

    expect(DVT_SINK_SECTION_SOURCE).toContain('Owned concern: render DVT sink authoring fields.');
    expect(DVT_SINK_SECTION_SOURCE).toContain('name="dvt-sink-write-mode"');
    expect(DVT_SINK_SECTION_SOURCE).toContain('inspectorDvtPartitionStrategyLabel');
  });
});
