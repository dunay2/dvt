/** Translate the protected worksheet-to-dbt command and its refusal receipts. */
import { WorksheetDbtModelResultSchema } from '@dvt/contracts';
import type { IWorksheetDbtModelCommand } from '../../ports/worksheetDbtModel';
import { ApiError, type ApiClient } from '../api/createApiClient';

export function createWorksheetDbtModelCommand(client: ApiClient): IWorksheetDbtModelCommand {
  return {
    async create({ tenantId, projectId, environmentId }, request) {
      const endpoint =
        '/workspace/dbt/worksheet-model?' +
        new URLSearchParams({ tenantId, projectId, environmentId });
      const response = await client.requestRaw(endpoint, { method: 'POST', jsonBody: request });
      const payload: unknown = await response.json().catch(() => null);
      if (response.ok || response.status === 409)
        return WorksheetDbtModelResultSchema.parse(payload);
      throw new ApiError({
        message: 'Worksheet model creation failed',
        endpoint,
        statusCode: response.status,
        category: response.status >= 500 ? 'server' : 'client',
        responseBody: payload,
      });
    },
  };
}
