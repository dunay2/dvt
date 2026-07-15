/** Owned concern: adapt the canonical dbt project import rails to protected browser HTTP. */
import {
  DbtProjectImportCommandSchema,
  DbtProjectImportResultSchema,
  DbtProjectImportValidationReportSchema,
  ValidateDbtProjectImportRequestSchema,
} from '@dvt/contracts';

import type { IDbtProjectImportPort } from '../../ports/dbtProjectImport';
import type { ApiClient } from '../api/createApiClient';
import { readGrantedWorkspaceScope } from '../session/workspaceScopeSelectionPort';

const DBT_PROJECT_IMPORT_ENDPOINT = '/workspace/dbt/import';
const DBT_PROJECT_IMPORT_VALIDATE_ENDPOINT = `${DBT_PROJECT_IMPORT_ENDPOINT}/validate`;

function buildScopedEndpoint(endpoint: string): string {
  const { tenantId, projectId, environmentId } = readGrantedWorkspaceScope();
  const query = new URLSearchParams({ tenantId, projectId, environmentId });
  return `${endpoint}?${query.toString()}`;
}

export function createApiDbtProjectImportPort(apiClient: ApiClient): IDbtProjectImportPort {
  return {
    async validateProject(request) {
      const command = ValidateDbtProjectImportRequestSchema.parse(request);
      const payload = await apiClient.postJson(
        buildScopedEndpoint(DBT_PROJECT_IMPORT_VALIDATE_ENDPOINT),
        command
      );
      return DbtProjectImportValidationReportSchema.parse(payload);
    },

    async importProject(command) {
      const parsedCommand = DbtProjectImportCommandSchema.parse(command);
      const payload = await apiClient.postJson(
        buildScopedEndpoint(DBT_PROJECT_IMPORT_ENDPOINT),
        parsedCommand
      );
      return DbtProjectImportResultSchema.parse(payload);
    },
  };
}
