/** Owned concern: declare execution posture for registered Canvas runtimes. */
import type { DbtExecutionTargetIdentity, GenericGraphSourceV1 } from '@dvt/contracts';

export type CanvasExecutionStrategy =
  | {
      kind: 'planner_generic_preview';
      previewProfile: 'planner-generic-v1';
      sourceFamily: 'dbt';
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
      executionTarget: DbtExecutionTargetIdentity;
    }
  | {
      kind: 'not_executable';
    };
