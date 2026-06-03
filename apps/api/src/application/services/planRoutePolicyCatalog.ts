/**
 * Owned concern: publish the canonical plan-route authorization and planner
 * input policy matrix for preview, import, and compile routes.
 */
import {
  AUTHORIZATION_ACTION,
  type CommandAuthorizationAction,
} from '../ports/accessDecision.js';

export interface PlanRoutePlannerInputPolicy {
  readonly ownershipSource: 'authorized-scope' | 'seed' | 'none';
  readonly requestMetadataSource: 'authorized-context' | 'none';
}

export interface PlanRoutePolicyDefinition {
  readonly authorization: CommandAuthorizationAction;
  readonly plannerInput: PlanRoutePlannerInputPolicy | null;
  readonly importedPlanOwnershipSource: 'command' | 'none';
}

export const PLAN_ROUTE_POLICY_CATALOG = {
  PREVIEW: {
    authorization: AUTHORIZATION_ACTION.runStart,
    plannerInput: {
      ownershipSource: 'authorized-scope',
      requestMetadataSource: 'authorized-context',
    },
    importedPlanOwnershipSource: 'none',
  },
  IMPORT: {
    authorization: AUTHORIZATION_ACTION.runStart,
    plannerInput: null,
    importedPlanOwnershipSource: 'command',
  },
  COMPILE: {
    authorization: AUTHORIZATION_ACTION.runStart,
    plannerInput: {
      ownershipSource: 'authorized-scope',
      requestMetadataSource: 'authorized-context',
    },
    importedPlanOwnershipSource: 'none',
  },
} as const satisfies Readonly<Record<'PREVIEW' | 'IMPORT' | 'COMPILE', PlanRoutePolicyDefinition>>;
