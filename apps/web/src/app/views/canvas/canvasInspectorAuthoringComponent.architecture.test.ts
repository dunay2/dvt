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
const DBT_AUTHORING_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'dbtAuthoringFieldsModel.ts'
);
const DBT_SOURCE_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DbtSourceAuthoringSection.tsx'
);
const DBT_MODEL_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DbtModelAuthoringSection.tsx'
);
const DBT_MODEL_CODE_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DbtModelCodeAuthoringSection.tsx'
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
const NODE_WORKBENCH_PANEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasNodeWorkbenchPanel.tsx'
);
const DBT_PROJECT_FILE_CANVAS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DbtProjectFileCanvasView.tsx'
);
const HTTP_JSON_FIELDS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/httpJson/HttpJsonArtifactAuthoringFields.tsx'
);

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
    expect(COMMAND_SOURCE).toContain('workspaceScope');
    expect(COMMAND_SOURCE).not.toContain("from 'react'");
    expect(COMMAND_SOURCE).not.toContain('useState(');

    expect(HOOK_SOURCE).toContain(
      'Owned concern: expose route-owned Inspector mutation commands over the Canvas draft aggregate.'
    );
    expect(HOOK_SOURCE).toContain('applyCanvasInspectorNodeDraftToSession');
    expect(HOOK_SOURCE).toContain('workspaceScope');
    expect(HOOK_SOURCE).toContain('convertDvtVisualTransformToSql');
    expect(HOOK_SOURCE).toContain('canvasDraftSession.workingSet.upsertNode');
    expect(HOOK_SOURCE).not.toContain('workspaceService');

    expect(SECTION_SOURCE).toContain(
      'Owned concern: orchestrate the route-owned Inspector authoring surface for governed node details.'
    );
    expect(SECTION_SOURCE).toContain('draftController');
    expect(SECTION_SOURCE).toContain('workspaceScope: authoring.workspaceScope');
    expect(SECTION_SOURCE).not.toContain('createCanvasInspectorNodeDraft');
    expect(SECTION_SOURCE).toContain('DbtAuthoringFields');
    expect(SECTION_SOURCE).toContain('DvtAuthoringFields');
    expect(SECTION_SOURCE).not.toContain('useCanvasController');
    expect(SECTION_SOURCE).not.toContain('workspaceService');

    expect(DBT_FIELDS_SOURCE).toContain(
      'Owned concern: render dbt-specific Canvas Inspector authoring fields.'
    );
    expect(DBT_FIELDS_SOURCE).toContain('DbtModelCodeAuthoringSection');
    expect(DBT_MODEL_CODE_SECTION_SOURCE).toContain('MonacoCodeEditor');
    expect(DBT_MODEL_CODE_SECTION_SOURCE).toContain(
      "from '../../components/monaco/MonacoCodeEditor'"
    );
    expect(DBT_MODEL_CODE_SECTION_SOURCE).not.toContain("from '../../components/ui/textarea'");
    expect(DBT_MODEL_CODE_SECTION_SOURCE).not.toContain('@monaco-editor/react');
    expect(DBT_FIELDS_SOURCE).not.toContain('workspaceService');

    expect(DVT_FIELDS_SOURCE).toContain(
      'Owned concern: render DVT-specific Canvas Inspector authoring fields.'
    );
    expect(DVT_FIELDS_SOURCE).toContain('DvtSourceAuthoringSection');
    expect(DVT_FIELDS_SOURCE).toContain('DvtSqlTransformAuthoringSection');
    expect(DVT_FIELDS_SOURCE).toContain('DvtSinkAuthoringSection');
    expect(DVT_SQL_SECTION_SOURCE).toContain('MonacoCodeEditor');
    expect(DVT_SQL_SECTION_SOURCE).toContain("from '../../components/monaco/MonacoCodeEditor'");
    expect(DVT_SQL_SECTION_SOURCE).not.toContain('@monaco-editor/react');
    expect(DVT_FIELDS_SOURCE).not.toContain('workspaceService');

    expect(NODE_WORKBENCH_PANEL_SOURCE).toContain(
      'Owned concern: render the Canvas-owned contextual node workbench panel.'
    );
    expect(NODE_WORKBENCH_PANEL_SOURCE).toContain('CanvasInspectorAuthoringSection');
    expect(NODE_WORKBENCH_PANEL_SOURCE).not.toContain("from '../../components/InspectorPanel'");
  });

  it('keeps Inspector authoring visible copy behind the Canvas i18n catalog', () => {
    expect(SECTION_SOURCE).toContain('canvasViewCopy');
    expect(DBT_FIELDS_SOURCE).toContain('canvasViewCopy');
    expect(DVT_SOURCE_SECTION_SOURCE).toContain('canvasViewCopy');
    expect(DVT_SQL_SECTION_SOURCE).toContain('canvasViewCopy');
    expect(DVT_SINK_SECTION_SOURCE).toContain('canvasViewCopy');
    expect(SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DBT_SOURCE_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DBT_MODEL_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DVT_SOURCE_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DVT_SQL_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(DVT_SINK_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(HTTP_JSON_FIELDS_SOURCE).toContain('canvasViewCopy');
    expect(HTTP_JSON_FIELDS_SOURCE).toContain('formatCanvasInspectorNodeDraftError');
    expect(HTTP_JSON_FIELDS_SOURCE).not.toContain('Revisa este valor.');
    expect(HTTP_JSON_FIELDS_SOURCE).not.toContain('Adquisición HTTP JSON');

    expect(DBT_SOURCE_SECTION_SOURCE).toContain('canvasViewCopy.inspectorDbtPackageLabel');
    expect(DBT_MODEL_CODE_SECTION_SOURCE).toContain('canvasViewCopy.inspectorDbtModelSqlLabel');
    expect(DVT_SINK_SECTION_SOURCE).toContain('canvasViewCopy.inspectorDvtWriteModeLabel');
    expect(ERROR_CODES_SOURCE).toContain('export type CanvasInspectorNodeDraftErrorCode');
    expect(MODEL_SOURCE).not.toContain('canvasViewCopy');
    expect(MODEL_SOURCE).not.toContain('inspectorError');
    expect(MODEL_SOURCE).toContain('node_name_required');
    expect(MODEL_SOURCE).toContain('dbt_package_required');
  });

  it('models Graph Draft Apply as one nullable port without unrelated authoring commands', () => {
    expect(TYPES_SOURCE).toContain('export type CanvasNodeDraftAuthoringPort');
    expect(TYPES_SOURCE).toContain('apply: (draft: CanvasInspectorNodeDraft) => void;');
    expect(TYPES_SOURCE).toContain('nodeDraftAuthoring: CanvasNodeDraftAuthoringPort | null;');
    expect(TYPES_SOURCE).not.toContain('canEditNode');
    expect(TYPES_SOURCE).not.toContain('onApplyNodeDraft');
    expect(TYPES_SOURCE).not.toContain('onConvertVisualTransformToSql');
    expect(TYPES_SOURCE).not.toContain('workspaceScope');

    expect(SECTION_SOURCE).toContain('authoring.nodeDraftAuthoring.apply(draft)');
    expect(SECTION_SOURCE).not.toContain('authoring.canEditNode');
    expect(NODE_WORKBENCH_PANEL_SOURCE).not.toContain('authoring.onConvertVisualTransformToSql');

    expect(DBT_PROJECT_FILE_CANVAS_SOURCE).toContain('nodeDraftAuthoring: null');
    expect(DBT_PROJECT_FILE_CANVAS_SOURCE).not.toContain('unsupportedFileProjectionCommand');
    expect(DBT_PROJECT_FILE_CANVAS_SOURCE).not.toContain('Edit graph node properties');
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
    expect(DVT_SQL_SECTION_SOURCE).toContain('MonacoCodeEditor');
    expect(DVT_SQL_SECTION_SOURCE).toContain('inspectorDvtSqlLinePluralLabel');
    expect(DVT_SQL_SECTION_SOURCE).not.toContain('name="dvt-transform-column"');

    expect(DVT_SINK_SECTION_SOURCE).toContain('Owned concern: render DVT sink authoring fields.');
    expect(DVT_SINK_SECTION_SOURCE).toContain('name="dvt-sink-write-mode"');
    expect(DVT_SOURCE_SECTION_SOURCE).not.toContain('name="dvt-source-database"');
    expect(DVT_SINK_SECTION_SOURCE).not.toContain('name="dvt-sink-database"');
    expect(DVT_SINK_SECTION_SOURCE).not.toContain('name="dvt-sink-partition-strategy"');
  });

  it('keeps dbt source and model authoring in separate presentation leaves', () => {
    expect(DBT_FIELDS_SOURCE).not.toContain("from '../../components/ui/input'");
    expect(DBT_FIELDS_SOURCE).not.toContain("from '../../components/ui/label'");
    expect(DBT_FIELDS_SOURCE).not.toContain('graphVisualClasses.inspectorSelectInput');
    expect(DBT_FIELDS_SOURCE).not.toContain('name="dbt-source"');
    expect(DBT_FIELDS_SOURCE).not.toContain('name="dbt-materialized"');
    expect(DBT_FIELDS_SOURCE).toContain('DbtSourceAuthoringSection');
    expect(DBT_FIELDS_SOURCE).toContain('DbtModelAuthoringSection');
    expect(DBT_FIELDS_SOURCE).toContain('DbtModelCodeAuthoringSection');
    expect(DBT_FIELDS_SOURCE).toContain('buildDbtAuthoringModelProjection');

    expect(DBT_AUTHORING_MODEL_SOURCE).toContain(
      'Owned concern: derive dbt Inspector authoring presentation state from Canvas graph inputs.'
    );
    expect(DBT_AUTHORING_MODEL_SOURCE).toContain('buildDbtAuthoringModelProjection');
    expect(DBT_AUTHORING_MODEL_SOURCE).toContain('projectDbtModelArtifact');
    expect(DBT_AUTHORING_MODEL_SOURCE).not.toContain("from 'react'");
    expect(DBT_AUTHORING_MODEL_SOURCE).not.toContain('canvasViewCopy');

    expect(DBT_SOURCE_SECTION_SOURCE).toContain(
      'Owned concern: render dbt source authoring fields.'
    );
    expect(DBT_SOURCE_SECTION_SOURCE).toContain('name="dbt-source"');
    expect(DBT_SOURCE_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');

    expect(DBT_MODEL_SECTION_SOURCE).toContain('Owned concern: render dbt model authoring fields.');
    expect(DBT_MODEL_SECTION_SOURCE).toContain('name="dbt-materialized"');
    expect(DBT_MODEL_SECTION_SOURCE).toContain('formatCanvasInspectorNodeDraftError');

    expect(DBT_MODEL_CODE_SECTION_SOURCE).toContain(
      'Owned concern: render the editable DBT model code surface and artifact provenance.'
    );
    expect(DBT_MODEL_CODE_SECTION_SOURCE).toContain('MonacoCodeEditor');
    expect(DBT_MODEL_CODE_SECTION_SOURCE).not.toContain('Textarea');
    expect(DBT_MODEL_CODE_SECTION_SOURCE).toContain('formatCanvasCopyTemplate');
  });
});
