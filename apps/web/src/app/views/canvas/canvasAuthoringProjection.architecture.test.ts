import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const AUTHORING_GRAPH_PROJECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasAuthoringGraphProjection.ts'
);
const AUTHORING_PROJECTION_HOOK_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasAuthoringProjection.ts'
);
const VIEWPORT_GRAPH_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasViewportGraphModel.ts'
);
const COLUMN_LINEAGE_PROJECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasColumnLineageProjection.ts'
);
const COLUMN_MAPPING_AUTHORING_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasColumnMappingAuthoring.ts'
);
const VISUAL_SQL_ADAPTER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasVisualTransformSql.ts'
);
const VISUAL_SQL_COMPILER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasVisualTransformSqlCompiler.ts'
);
const PREVIEW_PROVENANCE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasPreviewProvenance.ts'
);
const DRAFT_READ_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftReadModel.ts'
);
const WORKSPACE_DRAFT_PROJECTION_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, '../../services/workspace/workspaceGraphDraftProjection.ts'),
  'utf8'
);

describe('canvas authoring projection component architecture', () => {
  it('keeps boundary projection, semantic composition, hook composition, and viewport projection in separate seams', () => {
    expect(WORKSPACE_DRAFT_PROJECTION_SOURCE).toContain(
      'Owned concern: project the protected workspace-graph-draft boundary'
    );
    expect(WORKSPACE_DRAFT_PROJECTION_SOURCE).toContain(
      'export function projectWorkspaceGraphAuthoringDraftSemanticGraph'
    );
    expect(WORKSPACE_DRAFT_PROJECTION_SOURCE).not.toContain('@xyflow/react');

    expect(DRAFT_READ_MODEL_SOURCE).toContain(
      'Owned concern: translate protected draft-authoring outcomes'
    );
    expect(DRAFT_READ_MODEL_SOURCE).toContain('semanticGraph: CanvasAuthoringSemanticGraph');
    expect(DRAFT_READ_MODEL_SOURCE).toContain('projectWorkspaceGraphAuthoringDraftSemanticGraph(');
    expect(DRAFT_READ_MODEL_SOURCE).not.toContain('useNodesState(');

    expect(AUTHORING_GRAPH_PROJECTION_SOURCE).toContain(
      'Owned concern: compose semantic authoring truth'
    );
    expect(AUTHORING_GRAPH_PROJECTION_SOURCE).toContain('CanvasAuthoringSemanticGraph');
    expect(AUTHORING_GRAPH_PROJECTION_SOURCE).not.toContain('@xyflow/react');
    expect(AUTHORING_GRAPH_PROJECTION_SOURCE).not.toContain('useNodesState(');
    expect(AUTHORING_GRAPH_PROJECTION_SOURCE).not.toContain('useEdgesState(');

    expect(AUTHORING_PROJECTION_HOOK_SOURCE).toContain(
      'Owned concern: compose semantic authoring projection and viewport projection'
    );
    expect(AUTHORING_PROJECTION_HOOK_SOURCE).toContain('buildCanvasAuthoringGraphProjection(');
    expect(AUTHORING_PROJECTION_HOOK_SOURCE).toContain('useCanvasViewportGraphModel(');
    expect(AUTHORING_PROJECTION_HOOK_SOURCE).not.toContain('@xyflow/react');

    expect(VIEWPORT_GRAPH_MODEL_SOURCE).toContain(
      'Owned concern: project semantic authoring truth into React Flow viewport state only.'
    );
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).toContain('useNodesState(');
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).toContain('useEdgesState(');
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).not.toContain('CanvasAuthoringSemanticGraph');
    expect(VIEWPORT_GRAPH_MODEL_SOURCE).not.toContain(
      'projectWorkspaceGraphAuthoringDraftSemanticGraph('
    );
  });

  it('derives column lineage from recipe authority without introducing a parallel edge store', () => {
    expect(COLUMN_LINEAGE_PROJECTION_SOURCE).toContain(
      'derive stable Canvas column handles and lineage edges from semantic recipe truth'
    );
    expect(COLUMN_LINEAGE_PROJECTION_SOURCE).toContain('readDvtTransformAuthoringAuthority(');
    expect(COLUMN_LINEAGE_PROJECTION_SOURCE).not.toContain('useEdgesState(');
    expect(COLUMN_LINEAGE_PROJECTION_SOURCE).not.toContain('localStorage');

    expect(COLUMN_MAPPING_AUTHORING_SOURCE).toContain(
      'translate column-mapping intent into the existing DVT node command authority'
    );
    expect(COLUMN_MAPPING_AUTHORING_SOURCE).toContain('canvasDraftSession.workingSet.upsertNode(');
    expect(COLUMN_MAPPING_AUTHORING_SOURCE).not.toContain('useEdgesState(');
    expect(COLUMN_MAPPING_AUTHORING_SOURCE).not.toContain('localStorage');
  });

  it('derives generated SQL and Preview from the same recipe authority without a parallel planner or store', () => {
    expect(COLUMN_LINEAGE_PROJECTION_SOURCE).toContain('readDvtTransformAuthoringAuthority(');
    expect(VISUAL_SQL_ADAPTER_SOURCE).toContain('readDvtTransformAuthoringAuthority(');
    expect(VISUAL_SQL_ADAPTER_SOURCE).toContain('compileVisualTransformRecipeToPostgresSql(');
    expect(PREVIEW_PROVENANCE_SOURCE).toContain('compileDvtVisualTransformNodeToPostgresSql(');
    expect(VISUAL_SQL_COMPILER_SOURCE).toContain(
      'compile the bounded visual transform recipe into deterministic PostgreSQL SQL'
    );
    expect(VISUAL_SQL_COMPILER_SOURCE).not.toContain('localStorage');
    expect(VISUAL_SQL_COMPILER_SOURCE).not.toContain('useState(');
    expect(VISUAL_SQL_COMPILER_SOURCE).not.toContain('PlanRef');
  });
});
