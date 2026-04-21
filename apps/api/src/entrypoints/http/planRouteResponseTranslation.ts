/**
 * Owned concern: public component API for plan-route response translation,
 * grouping preview, compile, and import HTTP response mapping behind one local
 * semantic seam.
 */
import {
  mapCompilePlanInternalError,
  mapCompilePlanUseCaseResult,
} from './compilePlanRouteResponseMapper.js';
import {
  mapImportPlanInternalError,
  mapImportPlanUseCaseResult,
} from './importPlanRouteResponseMapper.js';
import { mapPreviewPlanContractIssue } from './planPreviewContractErrorMapper.js';
import {
  mapPreviewPlanInternalError,
  mapPreviewPlanUseCaseResult,
} from './previewPlanRouteResponseMapper.js';

export const planRouteResponseTranslation = {
  compile: {
    result: mapCompilePlanUseCaseResult,
    internalError: mapCompilePlanInternalError,
  },
  import: {
    result: mapImportPlanUseCaseResult,
    internalError: mapImportPlanInternalError,
  },
  preview: {
    contractIssue: mapPreviewPlanContractIssue,
    result: mapPreviewPlanUseCaseResult,
    internalError: mapPreviewPlanInternalError,
  },
} as const;
