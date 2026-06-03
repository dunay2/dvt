/** Owned concern: compose the API plans-port adapter for product app services. */
import type { IPlansPort } from '../../ports/plans';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { createApiPlansService } from './plansService.api';

export function createPlansService(apiClient: ApiClient = createApiClient()): IPlansPort {
  return createApiPlansService(apiClient);
}
