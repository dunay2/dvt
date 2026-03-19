// ── Transitional re-export — Slice 4 compatibility bridge ────────────────────
//
// ICompiledCodeStorage has moved to @dvt/artifacts (ADR-0034, Slice 4).
// This file is a temporary bridge for any remaining internal planner imports.
// Once all internal callers are updated, this file will be removed.
//
// DO NOT add new planner-internal code that imports from this path.
//
export type { ICompiledCodeStorage } from '@dvt/artifacts';
