/**
 * Owned concern: define structural rejections for Transform definition commands.
 * @baseline ADR-0044: diagnostic prose is not a semantic contract.
 * @decision Carry stable codes and field names; presentation owns translated messages.
 * @consequence Rejected edits remain atomic and actionable without parsing exception text.
 * @version 1.0.0
 */
export const TRANSFORM_DEPENDENCY_REJECTION = {
  cycle: 'transform_dependency_cycle',
  typeConflict: 'transform_dependency_type_conflict',
  referenced: 'transform_definition_referenced',
  unavailable: 'transform_dependency_unavailable',
  ambiguous: 'transform_dependency_ambiguous',
} as const;

export type TransformDependencyRejectionCode =
  (typeof TRANSFORM_DEPENDENCY_REJECTION)[keyof typeof TRANSFORM_DEPENDENCY_REJECTION];

export class TransformDependencyError extends Error {
  constructor(
    readonly code: TransformDependencyRejectionCode,
    readonly fields: readonly string[] = [],
    options?: ErrorOptions
  ) {
    super(code, options);
    this.name = 'TransformDependencyError';
  }
}
