/**
 * Owns DVT admission rejection definitions for PreviewPlan and StartRun.
 * @baseline ADR-0044: Diagnostic prose is not a semantic or presentation contract.
 * @decision Reuse named immutable definitions; translations belong to Web.
 * @consequence DVT decisions do not construct messages or repeat wire identifiers.
 * @version 1.0.0
 */
import { defineOperationalRejection } from './OperationalRejection.v1.js';

export const DVT_REJECTIONS = Object.freeze({
  runWorkloadCountInvalid: defineOperationalRejection(
    'dvt_run_workload_count_invalid',
    'DVT operational Run requires exactly one workload.'
  ),
  runIntentRequired: defineOperationalRejection(
    'dvt_run_intent_required',
    'DVT operational Run requires an explicit Run intent under workload V1.'
  ),
  runConnectionUnavailable: defineOperationalRejection(
    'dvt_run_connection_unavailable',
    'The DVT Run connection is not executable.'
  ),
  runPublicationUnavailable: defineOperationalRejection(
    'dvt_run_publication_unavailable',
    'DVT PostgreSQL publication admission is not configured.'
  ),
  runConnectionNotFound: defineOperationalRejection(
    'dvt_run_connection_not_found',
    'The DVT Run connection is not in this workspace.'
  ),
  runTargetUnmanaged: defineOperationalRejection(
    'dvt_run_target_unmanaged',
    'The DVT Run target is not managed by DVT.'
  ),
  runSchemaMismatch: defineOperationalRejection(
    'dvt_run_schema_mismatch',
    'The DVT Run target schema differs from Preview.'
  ),
  previewScopeIncomplete: defineOperationalRejection(
    'dvt_preview_scope_incomplete',
    'Authorized scope is missing projectId or environmentId.'
  ),
  previewCanvasMismatch: defineOperationalRejection(
    'dvt_preview_canvas_mismatch',
    'The requested Canvas no longer matches the active protected Canvas.'
  ),
  previewTargetProjectionFailed: defineOperationalRejection(
    'dvt_preview_target_projection_failed',
    'The protected Transform could not be projected to its PostgreSQL target.'
  ),
  previewWorkloadProjectionFailed: defineOperationalRejection(
    'dvt_preview_workload_projection_failed',
    'The protected Transform workload could not be admitted.'
  ),
  projectionStale: defineOperationalRejection(
    'dvt_projection_stale',
    'Target projection is stale or belongs to another output or connection.'
  ),
  runSchemaDigestRequired: defineOperationalRejection(
    'dvt_run_schema_digest_required',
    'Configured Run requires a canonical PostgreSQL output schema digest.'
  ),
  runConfigInvalid: defineOperationalRejection(
    'dvt_run_config_invalid',
    'Transform config must be an object.'
  ),
  runDispositionUnsupported: defineOperationalRejection(
    'dvt_run_disposition_unsupported',
    'Configured Run supports only table result disposition.'
  ),
  runTargetInvalid: defineOperationalRejection(
    'dvt_run_target_invalid',
    'Configured Run requires one valid PostgreSQL result target.'
  ),
});

export type DvtOperationalRejection = (typeof DVT_REJECTIONS)[keyof typeof DVT_REJECTIONS];
export type DvtOperationalRejectionCause = DvtOperationalRejection['cause'];
