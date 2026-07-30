import path from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const EXECUTION_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/canvasExecutionStrategyContracts.ts'
);
const DBT_CONTRIBUTIONS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/dbt/dbtContributions.ts'
);
const PLAN_ACTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasPlanAction.ts'
);
const PLAN_ACTION_PATH = path.resolve(import.meta.dirname, 'canvasPlanAction.ts');
const WEB_TSCONFIG_PATH = path.resolve(import.meta.dirname, '../../../../tsconfig.json');
const DBT_EXECUTION_PROJECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDbtExecutionProjection.ts'
);
const DBT_ARTIFACT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDbtWorkspaceArtifacts.ts'
);
const DBT_ARTIFACT_PUBLISHER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'dbtGraphWorkspaceArtifactPublisher.ts'
);
const DBT_GRAPH_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDbtPlannerGraphSource.ts'
);
const DBT_GRAPH_SOURCE_PATH = path.resolve(import.meta.dirname, 'canvasDbtPlannerGraphSource.ts');
const DBT_SCOPE_POLICY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'dbtExecutionScopePolicy.ts'
);
const DBT_AUTHORING_FIELDS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DbtAuthoringFields.tsx'
);
const DBT_MODEL_AUTHORING_SECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'DbtModelAuthoringSection.tsx'
);
const COMMAND_CATALOG_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
);
const GRAPH_FRONTEND_ARCHITECTURE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../../../../../docs/architecture/components/web/graph/graph-frontend-architecture.md'
);

function canonicalPath(filePath: string): string {
  const normalized = path.normalize(filePath);
  return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
}

function resolvePlanActionImportPaths(): readonly string[] {
  const config = ts.readConfigFile(WEB_TSCONFIG_PATH, ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(WEB_TSCONFIG_PATH)
  );
  if (parsedConfig.errors.length > 0) {
    throw new Error(
      parsedConfig.errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
        .join('\n')
    );
  }

  return ts
    .preProcessFile(PLAN_ACTION_SOURCE, true, true)
    .importedFiles.map(
      (importedFile) =>
        ts.resolveModuleName(importedFile.fileName, PLAN_ACTION_PATH, parsedConfig.options, ts.sys)
          .resolvedModule
    )
    .filter(
      (resolvedModule): resolvedModule is ts.ResolvedModuleFull => resolvedModule !== undefined
    )
    .map((resolvedModule) => canonicalPath(resolvedModule.resolvedFileName));
}

describe('canvas dbt authoring/code/run architecture', () => {
  it('registers dbt as planner-generic preview instead of a non-executable canvas', () => {
    expect(EXECUTION_STRATEGY_SOURCE).toContain("kind: 'planner_generic_preview'");
    expect(DBT_CONTRIBUTIONS_SOURCE).toContain("kind: 'planner_generic_preview'");
    expect(DBT_CONTRIBUTIONS_SOURCE).toContain("previewProfile: 'planner-generic-v1'");
    expect(DBT_CONTRIBUTIONS_SOURCE).not.toContain(
      "executionStrategy: {\n        kind: 'not_executable'"
    );
  });

  it('keeps dbt code generation and planner source projection behind named rails', () => {
    expect(PLAN_ACTION_SOURCE).toContain("from './canvasDbtWorkspaceArtifacts'");
    expect(PLAN_ACTION_SOURCE).toContain("from './canvasDbtExecutionProjection'");
    expect(resolvePlanActionImportPaths()).not.toContain(canonicalPath(DBT_GRAPH_SOURCE_PATH));
    expect(PLAN_ACTION_SOURCE).toContain("from './previewGraphSource'");
    expect(DBT_EXECUTION_PROJECTION_SOURCE).toContain("from './canvasDbtPlannerGraphSource'");
    expect(PLAN_ACTION_SOURCE).toContain("from './dbtGraphWorkspaceArtifactPublisher'");
    expect(PLAN_ACTION_SOURCE).toContain('publishGraphDbtWorkspaceArtifacts');
    expect(PLAN_ACTION_SOURCE).not.toContain('workspaceFileContentCommand.saveFileContent');
    expect(DBT_ARTIFACT_PUBLISHER_SOURCE).toContain('publicationCommand.publish');
    expect(DBT_ARTIFACT_PUBLISHER_SOURCE).not.toContain(
      'workspaceFileContentCommand.saveFileContent'
    );
    expect(PLAN_ACTION_SOURCE).toContain('previewProfile: executionStrategy.previewProfile');
    expect(DBT_ARTIFACT_SOURCE).toContain('buildDbtWorkspaceArtifacts');
    expect(DBT_ARTIFACT_SOURCE).toContain('dbt_project.yml');
    expect(DBT_ARTIFACT_SOURCE).toContain('models/schema.yml');
    expect(DBT_GRAPH_SOURCE).toContain('buildDbtPlannerGraphSource');
    expect(DBT_GRAPH_SOURCE).toContain('resolveDbtExecutableStepKind');
    expect(DBT_SCOPE_POLICY_SOURCE).toContain("'dbt:model': 'DBT_MODEL'");
    expect(DBT_SCOPE_POLICY_SOURCE).toContain("'dbt:test': 'DBT_TEST'");
    expect(DBT_SCOPE_POLICY_SOURCE).toContain("'dbt:snapshot': 'DBT_SNAPSHOT'");
  });

  it('keeps dbt card configuration in route-owned inspector authoring', () => {
    expect(DBT_AUTHORING_FIELDS_SOURCE).toContain('DbtModelAuthoringSection');
    expect(DBT_AUTHORING_FIELDS_SOURCE).not.toContain('workspaceService');
    expect(DBT_MODEL_AUTHORING_SECTION_SOURCE).toContain('name="dbt-origin"');
    expect(DBT_MODEL_AUTHORING_SECTION_SOURCE).toContain('name="dbt-materialized"');
    expect(DBT_MODEL_AUTHORING_SECTION_SOURCE).not.toContain('name="dbt-model-sql"');
    expect(DBT_MODEL_AUTHORING_SECTION_SOURCE).not.toContain('workspaceService');
    expect(COMMAND_CATALOG_SOURCE).toContain('ConfigureCanvasDbtNode');
    expect(COMMAND_CATALOG_SOURCE).toContain('SelectDbtModelOrigin');
    expect(COMMAND_CATALOG_SOURCE).toContain('GenerateDbtWorkspaceArtifacts');
    expect(COMMAND_CATALOG_SOURCE).toContain('BuildDbtPlannerGraphSource');
    expect(GRAPH_FRONTEND_ARCHITECTURE_SOURCE).toContain('planner-generic-v1');
    expect(GRAPH_FRONTEND_ARCHITECTURE_SOURCE).toContain('persisted `PlanRef`');
    expect(GRAPH_FRONTEND_ARCHITECTURE_SOURCE).not.toContain(
      'API-mode warehouse source import remains unavailable'
    );
  });
});
