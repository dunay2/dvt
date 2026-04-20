import type { AuthorizationAction } from '../../domain/auth/types.js';

type PlanRouteCommandAction = Extract<AuthorizationAction, { readonly kind: 'command' }>;

export const PLAN_ROUTE_AUTHORIZATION = {
  PREVIEW: { kind: 'command', name: 'run:start' },
  IMPORT: { kind: 'command', name: 'run:start' },
  COMPILE: { kind: 'command', name: 'run:start' },
} as const satisfies Readonly<
  Record<'PREVIEW' | 'IMPORT' | 'COMPILE', PlanRouteCommandAction>
>;
