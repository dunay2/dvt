/** Owned concern: resolve active-route startup readiness against runtime capability ordering. */
import {
  createRouteBootstrapStepCommand,
  type BootstrapStepStatusCommand,
} from './appBootstrapCommands';
import type { RouteBootstrapPresentation, RouteBootstrapStatus } from './routeBootstrapContract';

export type RouteBootstrapStartupReadinessState = Readonly<{
  activeRouteId: string | null;
  stablePresentation: RouteBootstrapPresentation | null;
}>;

export type RouteBootstrapStartupReadinessArgs = Readonly<{
  activeRouteId: string;
  capabilitiesColdStartPending: boolean;
  capabilitiesPendingDetail: string;
  presentation: RouteBootstrapPresentation;
  previousState: RouteBootstrapStartupReadinessState;
}>;

export type RouteBootstrapStartupReadinessResolution = Readonly<{
  command: BootstrapStepStatusCommand;
  canComplete: boolean;
  nextState: RouteBootstrapStartupReadinessState;
}>;

export function createInitialRouteBootstrapStartupReadinessState(): RouteBootstrapStartupReadinessState {
  return {
    activeRouteId: null,
    stablePresentation: null,
  };
}

export function resolveRouteBootstrapStartupReadiness(
  args: RouteBootstrapStartupReadinessArgs
): RouteBootstrapStartupReadinessResolution {
  const previousStablePresentation =
    args.previousState.activeRouteId === args.activeRouteId
      ? args.previousState.stablePresentation
      : null;
  const effectivePresentation = resolveEffectiveRoutePresentation(args, previousStablePresentation);
  const stablePresentation = isStableRouteBootstrapStatus(effectivePresentation.status)
    ? effectivePresentation
    : previousStablePresentation;

  return {
    command: createRouteBootstrapStepCommand(effectivePresentation),
    canComplete: effectivePresentation.canComplete,
    nextState: {
      activeRouteId: args.activeRouteId,
      stablePresentation,
    },
  };
}

function resolveEffectiveRoutePresentation(
  args: RouteBootstrapStartupReadinessArgs,
  previousStablePresentation: RouteBootstrapPresentation | null
): RouteBootstrapPresentation {
  if (args.capabilitiesColdStartPending && args.presentation.status === 'complete') {
    return {
      status: 'pending',
      detail: args.capabilitiesPendingDetail,
      canComplete: false,
    };
  }

  if (args.presentation.status === 'pending' && previousStablePresentation) {
    return previousStablePresentation;
  }

  return args.presentation;
}

function isStableRouteBootstrapStatus(status: RouteBootstrapStatus): boolean {
  return status !== 'pending';
}
