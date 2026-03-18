/**
 * Canonical adapter policy mapping table contract (Stage 1.1, G-01.7).
 *
 * ## Problem
 *
 * `AdapterPolicyMapper<TRetry, TTimeout, TConcurrency>` defines how an adapter
 * implements policy mapping at the TypeScript type level. However, the
 * requirement from §13 is that each adapter/runtime integration also publishes
 * one **explicit normative mapping table** — a static, human-readable audit
 * artifact that documents:
 *
 * - which canonical policy classes the adapter can honor
 * - what runtime enforcement shape each class maps to
 * - which classes the adapter cannot honor (and must reject via the
 *   executability gate with `POLICY_UNSUPPORTED`)
 *
 * This contract defines the table shape. `TEMPORAL_POLICY_MAPPING_TABLE` is
 * the canonical Temporal reference implementation.
 *
 * ## Authority rule
 *
 * - Each adapter package MUST export one `AdapterPolicyMappingTable` const.
 * - Silent reinterpretation of canonical policy semantics is out of contract.
 * - If an adapter cannot honor a class, it MUST set `canHonor: false` and
 *   return `ExecutabilityValidationResult { status: 'ERROR', code: 'POLICY_UNSUPPORTED' }`
 *   through the executability gate.
 *
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.7
 * @see packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md §13
 */

import type { PlannerPolicyCategory } from './PlannerPolicyVocabulary.v2.js';

// ── Entry type ────────────────────────────────────────────────────────────────

/**
 * One row in an adapter's policy mapping table.
 *
 * Each entry documents a single canonical policy kind and how (or whether)
 * the adapter enforces it.
 */
export interface PolicyMappingEntry {
  /** The canonical policy category. */
  policyCategory: PlannerPolicyCategory;

  /**
   * The `kind` discriminant from the canonical policy class
   * (e.g. `'at-most-once'`, `'budget'`, `'sequential'`).
   */
  policyKind: string;

  /**
   * Whether this adapter can faithfully honor the canonical class.
   *
   * `false` means the adapter MUST reject the plan through the executability
   * gate with `POLICY_UNSUPPORTED` when this policy class is present.
   */
  canHonor: boolean;

  /**
   * Human-readable description of the runtime enforcement shape.
   *
   * For `canHonor: true` — describe the runtime config produced
   * (e.g. `'maximumAttempts: N, backoff: exponential 1s–60s'`).
   * For `canHonor: false` — describe why the class cannot be honored.
   */
  runtimeEnforcement: string;

  /**
   * Optional caveats, known approximations, or degradation notes.
   *
   * Use this to document cases where the mapping is semantically correct
   * but involves approximation (e.g. "scheduleToCloseTimeout approximates
   * a step-level budget; does not split scheduling vs execution time").
   */
  notes?: string;
}

// ── Table type ────────────────────────────────────────────────────────────────

/**
 * Normative policy mapping table for one adapter.
 *
 * Exported as a named const from each adapter package. The table is a
 * compile-time audit artifact — it is not used at runtime for dispatching.
 */
export interface AdapterPolicyMappingTable {
  /** Adapter identifier matching `adapterId` in `ExecutabilityValidationResult`. */
  adapterId: string;

  /**
   * Semantic version of the adapter's mapping implementation.
   * Increment when any mapping changes semantics.
   */
  adapterVersion: string;

  /** ISO 8601 date of the last review of this mapping table. */
  lastReviewedDate: string;

  /** Complete list of mapping entries, one per canonical policy kind. */
  entries: readonly PolicyMappingEntry[];
}

// ── Temporal reference implementation ────────────────────────────────────────

/**
 * Canonical Temporal adapter policy mapping table.
 *
 * This is the reference implementation for `AdapterPolicyMappingTable`.
 * All other adapter packages MUST export an equivalent table.
 *
 * Matches the runtime behavior implemented in
 * `@dvt/adapter-temporal/src/TemporalPolicyMapper.ts`.
 */
export const TEMPORAL_POLICY_MAPPING_TABLE: AdapterPolicyMappingTable = {
  adapterId: 'temporal',
  adapterVersion: '1.0.0',
  lastReviewedDate: '2026-03-18',
  entries: [
    // ── Retry ────────────────────────────────────────────────────────────
    {
      policyCategory: 'retry',
      policyKind: 'at-most-once',
      canHonor: true,
      runtimeEnforcement: 'maximumAttempts: 1, nonRetryableErrorTypes: [PermanentStepError]',
    },
    {
      policyCategory: 'retry',
      policyKind: 'at-most-N',
      canHonor: true,
      runtimeEnforcement:
        'maximumAttempts: N (total-attempt semantics match canonical maxAttempts), ' +
        'exponential backoff: initialInterval 1s, maximumInterval 60s, coefficient 2',
      notes:
        'Canonical maxAttempts counts total attempts including first execution. ' +
        'Temporal maximumAttempts uses identical total-attempt semantics — mapping is 1:1.',
    },

    // ── Timeout ──────────────────────────────────────────────────────────
    {
      policyCategory: 'timeout',
      policyKind: 'unbounded',
      canHonor: true,
      runtimeEnforcement: 'No scheduleToCloseTimeout set on activity options.',
    },
    {
      policyCategory: 'timeout',
      policyKind: 'budget',
      canHonor: true,
      runtimeEnforcement: 'scheduleToCloseTimeout: maxSeconds + "s"',
      notes:
        'Stage 1.1 models timeout as one end-to-end step budget. ' +
        'scheduleToCloseTimeout is the closest Temporal activity knob. ' +
        'Does not separately model scheduling vs execution timeout.',
    },

    // ── Concurrency ──────────────────────────────────────────────────────
    {
      policyCategory: 'concurrency',
      policyKind: 'sequential',
      canHonor: true,
      runtimeEnforcement:
        'maxConcurrentActivityTaskExecutions: 1, maxConcurrentWorkflowTaskExecutions: 1',
      notes: 'Worker-level limit; does not prevent inter-workflow concurrency on the same worker.',
    },
    {
      policyCategory: 'concurrency',
      policyKind: 'bounded',
      canHonor: true,
      runtimeEnforcement:
        'maxConcurrentActivityTaskExecutions: maxParallel, maxConcurrentWorkflowTaskExecutions: maxParallel',
    },
    {
      policyCategory: 'concurrency',
      policyKind: 'unbounded',
      canHonor: true,
      runtimeEnforcement: 'No concurrency limit set on worker options.',
    },
  ],
} as const;
