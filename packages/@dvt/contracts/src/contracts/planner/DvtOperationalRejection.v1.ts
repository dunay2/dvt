/**
 * Owns stable rejection causes for the existing PreviewPlan and StartRun envelopes.
 * @baseline ADR-0044: Diagnostic prose is not a semantic or presentation contract.
 * @decision Reuse code/cause/reason; Web localizes by cause, never by diagnostic text.
 * @consequence Admission stays locale-independent and diagnostics never select product behavior.
 * @version 1.0.0
 */
export const DVT_OPERATIONAL_REJECTION_DIAGNOSTICS = {
  dvt_run_workload_count_invalid: 'DVT operational Run requires exactly one workload.',
  dvt_run_intent_required: 'DVT operational Run requires an explicit Run intent under workload V1.',
  dvt_run_connection_unavailable: 'The DVT Run connection is not executable.',
  dvt_run_publication_unavailable: 'DVT PostgreSQL publication admission is not configured.',
  dvt_run_connection_not_found: 'The DVT Run connection is not in this workspace.',
  dvt_run_target_unmanaged: 'The DVT Run target is not managed by DVT.',
  dvt_run_schema_mismatch: 'The DVT Run target schema differs from Preview.',
  run_execution_context_caller_ref_rejected:
    'Caller-provided run execution context references are not accepted for governed execution.',
  run_execution_context_store_unavailable: 'The run-context artifact store is not configured.',
  dvt_preview_scope_incomplete: 'Authorized scope is missing projectId or environmentId.',
  dvt_preview_canvas_mismatch:
    'The requested Canvas no longer matches the active protected Canvas.',
  dvt_preview_target_projection_failed:
    'The protected Transform could not be projected to its PostgreSQL target.',
  dvt_preview_workload_projection_failed: 'The protected Transform workload could not be admitted.',
  dvt_projection_stale: 'Target projection is stale or belongs to another output or connection.',
  dvt_run_schema_digest_required:
    'Configured Run requires a canonical PostgreSQL output schema digest.',
  dvt_run_config_invalid: 'Transform config must be an object.',
  dvt_run_disposition_unsupported: 'Configured Run supports only table result disposition.',
  dvt_run_target_invalid: 'Configured Run requires one valid PostgreSQL result target.',
} as const;

export type DvtOperationalRejectionCause = keyof typeof DVT_OPERATIONAL_REJECTION_DIAGNOSTICS;

export function createDvtOperationalRejection(cause: DvtOperationalRejectionCause): Readonly<{
  code: 'REJECTED';
  cause: DvtOperationalRejectionCause;
  reason: string;
}> {
  return { code: 'REJECTED' as const, cause, reason: DVT_OPERATIONAL_REJECTION_DIAGNOSTICS[cause] };
}
