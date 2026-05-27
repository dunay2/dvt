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
      kind: 'not_executable';
    };
