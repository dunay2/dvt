import { describeStoredPlanExecutabilityValidatorCapabilitiesCases } from './storedPlanExecutabilityValidator/capabilities.cases.js';
import { describeStoredPlanExecutabilityValidatorFetchAndAlignmentCases } from './storedPlanExecutabilityValidator/fetchAndAlignment.cases.js';
import { describeStoredPlanExecutabilityValidatorRegistryCases } from './storedPlanExecutabilityValidator/registry.cases.js';

/**
 * Stable test anchor for historical docs and evidence that reference
 * `StoredPlanExecutabilityValidator.test.ts`.
 *
 * The concrete cases and fixtures now live in smaller companion files grouped
 * by validator concern.
 */
describeStoredPlanExecutabilityValidatorCapabilitiesCases();
describeStoredPlanExecutabilityValidatorRegistryCases();
describeStoredPlanExecutabilityValidatorFetchAndAlignmentCases();

