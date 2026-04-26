/** Owned concern: declare execution posture for registered Canvas runtimes. */
export type CanvasExecutionStrategy =
  | {
      kind: 'transformation_preview';
      previewProfile: 'transformation-sql-first-v1';
    }
  | {
      kind: 'not_executable';
    };
