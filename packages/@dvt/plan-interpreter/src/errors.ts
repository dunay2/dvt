/**
 * @file packages/@dvt/plan-interpreter/src/errors.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Plan validation errors are structured with machine-readable codes for adapter-agnostic error handling
 * @consequence All adapters receive identical error semantics when plans are structurally invalid
 * @version 1.0.0
 * @date 2026-02-23
 */

import type { PlanValidationErrorCode } from './types.js';

/**
 * Structured error for plan validation failures.
 * Includes a machine-readable `code` and optional `detail` for diagnostics.
 */
export class PlanValidationError extends Error {
  readonly code: PlanValidationErrorCode;
  readonly detail?: string;

  constructor(code: PlanValidationErrorCode, message: string, detail?: string) {
    super(message);
    this.name = 'PlanValidationError';
    this.code = code;
    this.detail = detail;
  }
}
