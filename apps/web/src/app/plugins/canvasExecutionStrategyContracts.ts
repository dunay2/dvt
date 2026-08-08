/** Owned concern: declare execution posture for registered Canvas runtimes. */
import type { GenericGraphSourceV1 } from '@dvt/contracts';

export type CanvasExecutionStrategy =
  | {
      kind: 'transformation_preview';
      previewProfile: 'transformation-sql-first-v1';
    }
  | {
      kind: 'planner_generic_preview';
      previewProfile: 'planner-generic-v1';
      sourceFamily: 'dbt';
    }
  | {
      kind: 'python_code_preview';
      previewProfile: 'planner-generic-v1';
      sourceFamily: 'python-code';
    }
  | {
      kind: 'dbt_project_file_preview';
      previewProfile: 'planner-generic-v1';
      sourceFamily: 'dbt';
      canvasId: string;
      projectRoot: string;
      contentSetSha256: string;
      analysisSha256: string;
      dbtVersion: string;
      plannerGraphSource: GenericGraphSourceV1;
      executionTarget: {
        provider: string;
        adapter: string;
        targetName: string;
        credentialRef: string;
      };
    }
  | {
      kind: 'not_executable';
    };
