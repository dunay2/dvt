/**
 * Owned concern: define Run rejections for execution context and DBT binding.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Define each expected rejection once with stable message metadata.
 * @consequence The use case consumes values without rendering or string overloads.
 * @version 1.0.0
 */
import { defineOperationalRejection } from '../planner/OperationalRejection.v1.js';

export const RUN_REJECTIONS = Object.freeze({
  callerContextProvided: defineOperationalRejection(
    'run_execution_context_caller_ref_rejected',
    'Caller-provided run execution context references are not accepted for governed execution.'
  ),
  contextStoreUnavailable: defineOperationalRejection(
    'run_execution_context_store_unavailable',
    'The run-context artifact store is not configured.'
  ),
  dbtTargetRequired: defineOperationalRejection(
    'run_dbt_target_required',
    'A server-owned DBT execution target is required before Run.'
  ),
  dbtAdapterMismatch: defineOperationalRejection(
    'run_dbt_adapter_mismatch',
    'The selected runtime adapter does not match the server-owned DBT execution target.'
  ),
  dbtProvenanceInvalid: defineOperationalRejection(
    'run_dbt_provenance_invalid',
    'The persisted plan provenance is invalid.'
  ),
  dbtProvenanceNotProject: defineOperationalRejection(
    'run_dbt_provenance_not_project',
    'The persisted plan provenance does not describe a DBT project.'
  ),
  dbtTargetChanged: defineOperationalRejection(
    'run_dbt_target_changed',
    'The configured DBT execution target changed after Preview. Run Preview again.'
  ),
  dbtConnectionNotFound: defineOperationalRejection(
    'run_dbt_connection_not_found',
    'The Preview-bound DBT connection is not in this workspace.'
  ),
  dbtConnectionInvalid: defineOperationalRejection(
    'run_dbt_connection_invalid',
    'The Preview-bound DBT connection identity is invalid.'
  ),
  dbtProfileMismatch: defineOperationalRejection(
    'run_dbt_profile_mismatch',
    'The Preview-bound DBT profile does not resolve to its governed workspace connection.'
  ),
  bundleStoreUnavailable: defineOperationalRejection(
    'run_dbt_bundle_store_unavailable',
    'The DBT project bundle artifact store is not configured.'
  ),
  bundleStoreUnsupported: defineOperationalRejection(
    'run_dbt_bundle_store_unsupported',
    'The configured DBT project bundle store cannot create execution bundles.'
  ),
  projectUnavailable: defineOperationalRejection(
    'run_dbt_project_unavailable',
    'The authorized DBT project root is not available.'
  ),
  projectUnreadable: defineOperationalRejection(
    'run_dbt_project_unreadable',
    'The authorized DBT project could not be bundled safely.'
  ),
  projectRevisionMismatch: defineOperationalRejection(
    'run_dbt_project_revision_mismatch',
    'The DBT project changed after Preview. Run Preview again before Run.'
  ),
});

export type RunExecutionRejection = (typeof RUN_REJECTIONS)[keyof typeof RUN_REJECTIONS];
export type RunExecutionRejectionCause = RunExecutionRejection['cause'];
