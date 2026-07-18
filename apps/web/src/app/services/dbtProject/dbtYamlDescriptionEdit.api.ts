/** Owned concern: adapt governed dbt YAML description transactions to protected browser HTTP. */
import {
  ApplyDbtYamlDescriptionEditRequestSchema,
  DbtYamlDescriptionAppliedReceiptSchema,
  DbtYamlDescriptionEditProposalSchema,
  DbtYamlDescriptionRevertedReceiptSchema,
  ProposeDbtYamlDescriptionEditRequestSchema,
  RevertDbtYamlDescriptionEditRequestSchema,
} from '@dvt/contracts';

import type { IDbtYamlDescriptionEditPort } from '../../ports/dbtYamlDescriptionEdit';
import type { ApiClient } from '../api/createApiClient';
import { readWorkspaceFilesScope } from '../workspace/workspaceFilesHttp';

const DBT_YAML_DESCRIPTION_EDIT_ENDPOINT = Object.freeze({
  propose: '/workspace/dbt/description-edits/proposals',
  apply: '/workspace/dbt/description-edits/applications',
  revert: '/workspace/dbt/description-edits/reverts',
} as const);

export const DBT_YAML_DESCRIPTION_EDIT_HTTP_REASON = Object.freeze({
  authorityRequired: 'dbt_project_file_authority_required',
  documentInvalid: 'dbt_yaml_description_document_invalid',
  idempotencyConflict: 'dbt_yaml_description_idempotency_conflict',
  proposalMismatch: 'dbt_yaml_description_proposal_mismatch',
  receiptInvalid: 'dbt_yaml_description_receipt_invalid',
  resourceAmbiguous: 'dbt_yaml_description_resource_ambiguous',
  resourceNotFound: 'dbt_yaml_description_resource_not_found',
  resourceUnsupported: 'dbt_yaml_description_resource_unsupported',
  revisionConflict: 'dbt_yaml_description_revision_conflict',
} as const);

function buildScopedEndpoint(endpoint: string): string {
  return `${endpoint}?${new URLSearchParams(readWorkspaceFilesScope()).toString()}`;
}

export function createApiDbtYamlDescriptionEditPort(
  apiClient: ApiClient
): IDbtYamlDescriptionEditPort {
  return {
    async propose(request) {
      const payload = await apiClient.postJson(
        buildScopedEndpoint(DBT_YAML_DESCRIPTION_EDIT_ENDPOINT.propose),
        ProposeDbtYamlDescriptionEditRequestSchema.parse(request)
      );
      return DbtYamlDescriptionEditProposalSchema.parse(payload);
    },

    async apply(request) {
      const payload = await apiClient.postJson(
        buildScopedEndpoint(DBT_YAML_DESCRIPTION_EDIT_ENDPOINT.apply),
        ApplyDbtYamlDescriptionEditRequestSchema.parse(request)
      );
      return DbtYamlDescriptionAppliedReceiptSchema.parse(payload);
    },

    async revert(request) {
      const payload = await apiClient.postJson(
        buildScopedEndpoint(DBT_YAML_DESCRIPTION_EDIT_ENDPOINT.revert),
        RevertDbtYamlDescriptionEditRequestSchema.parse(request)
      );
      return DbtYamlDescriptionRevertedReceiptSchema.parse(payload);
    },
  };
}
