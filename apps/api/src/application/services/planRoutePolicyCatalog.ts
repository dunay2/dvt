import type { AuthorizationAction } from '../../domain/auth/types.js';

type PlanRouteCommandAction = Extract<AuthorizationAction, { readonly kind: 'command' }>;

export interface PlanRoutePlannerInputPolicy {
  readonly ownershipSource: 'authorized-scope' | 'seed' | 'none';
  readonly requestMetadataSource: 'authorized-context' | 'none';
}

export interface PlanRoutePolicyDefinition {
  readonly authorization: PlanRouteCommandAction;
  readonly plannerInput: PlanRoutePlannerInputPolicy | null;
  readonly importedPlanOwnershipSource: 'command' | 'none';
}

export const PLAN_ROUTE_POLICY_CATALOG = {
  PREVIEW: {
    authorization: { kind: 'command', name: 'run:start' },
    plannerInput: {
      ownershipSource: 'authorized-scope',
      requestMetadataSource: 'authorized-context',
    },
    importedPlanOwnershipSource: 'none',
  },
  IMPORT: {
    authorization: { kind: 'command', name: 'run:start' },
    plannerInput: null,
    importedPlanOwnershipSource: 'command',
  },
  COMPILE: {
    authorization: { kind: 'command', name: 'run:start' },
    plannerInput: {
      ownershipSource: 'authorized-scope',
      requestMetadataSource: 'authorized-context',
    },
    importedPlanOwnershipSource: 'none',
  },
} as const satisfies Readonly<Record<'PREVIEW' | 'IMPORT' | 'COMPILE', PlanRoutePolicyDefinition>>;
