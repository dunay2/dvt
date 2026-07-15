/** Owned concern: declare execution posture for registered Canvas runtimes. */
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
      kind: 'dbt_project_file_preview';
      previewProfile: 'planner-generic-v1';
      sourceFamily: 'dbt';
      projectRoot: string;
      contentSetSha256: string;
      analysisSha256: string;
      dbtVersion: string;
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
