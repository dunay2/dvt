/**
 * @file packages/@dvt/adapter-temporal/src/versioning.ts
 * @baseline ADR-0017: ExecutionPlan Schema Versioning
 * @version 0.1.0
 * @decision Adapters MUST declare their supported schemaVersion as a typed constant
 * @consequence matrix-alignment.test.ts imports this constant to validate plan-compat.json alignment in CI
 */

/**
 * The highest ExecutionPlan schemaVersion this adapter supports.
 * Format: { major, minor } — corresponds to "v{major}.{minor}" in plan-compat.json.
 *
 * Update this constant (and plan-compat.json) when support for a new schema version is added.
 * CI will fail on drift (matrix-alignment.test.ts).
 */
export const ADAPTER_SUPPORTED_SCHEMA = { major: 1, minor: 0 } as const;
