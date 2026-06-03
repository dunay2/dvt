/** Owned concern: resolve active-route startup readiness against runtime capability ordering. */
import {
  createRouteBootstrapStepCommand,
  type BootstrapStepStatusCommand,
} from './appBootstrapCommands';
import type { RouteBootstrapPresentation, RouteBootstrapStatus } from './routeBootstrapContract';

export type RouteBootstrapStartupReadinessState = Readonly<{
  activeRouteId: string | null;
  capabilitiesSuppressedPresentation: RouteBootstrapPresentation | null;
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
    capabilitiesSuppressedPresentation: null,
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
  const previousCapabilitiesSuppressedPresentation =
    args.previousState.activeRouteId === args.activeRouteId
      ? args.previousState.capabilitiesSuppressedPresentation
      : null;
  const effectivePresentation = resolveEffectiveRoutePresentation(
    args,
    previousStablePresentation,
    previousCapabilitiesSuppressedPresentation
  );
  const capabilitiesSuppressedPresentation = resolveCapabilitiesSuppressedPresentation(
    args,
    effectivePresentation,
    previousCapabilitiesSuppressedPresentation
  );
  const stablePresentation = isStableRouteBootstrapStatus(effectivePresentation.status)
    ? effectivePresentation
    : previousStablePresentation;

  return {
    command: createRouteBootstrapStepCommand(effectivePresentation),
    canComplete: effectivePresentation.canComplete,
    nextState: {
      activeRouteId: args.activeRouteId,
      capabilitiesSuppressedPresentation,
      stablePresentation,
    },
  };
}

function resolveEffectiveRoutePresentation(
  args: RouteBootstrapStartupReadinessArgs,
  previousStablePresentation: RouteBootstrapPresentation | null,
  previousCapabilitiesSuppressedPresentation: RouteBootstrapPresentation | null
): RouteBootstrapPresentation {
  if (args.capabilitiesColdStartPending && args.presentation.status === 'complete') {
    return {
      status: 'pending',
      detail: args.capabilitiesPendingDetail,
      canComplete: false,
    };
  }

  if (
    args.capabilitiesColdStartPending &&
    args.presentation.status === 'pending' &&
    previousCapabilitiesSuppressedPresentation
  ) {
    return previousCapabilitiesSuppressedPresentation;
  }

  if (args.presentation.status === 'pending' && previousStablePresentation) {
    return previousStablePresentation;
  }

  return args.presentation;
}

function resolveCapabilitiesSuppressedPresentation(
  args: RouteBootstrapStartupReadinessArgs,
  effectivePresentation: RouteBootstrapPresentation,
  previousCapabilitiesSuppressedPresentation: RouteBootstrapPresentation | null
): RouteBootstrapPresentation | null {
  if (!args.capabilitiesColdStartPending) {
    return null;
  }

  if (args.presentation.status === 'complete') {
    return effectivePresentation;
  }

  if (args.presentation.status === 'pending' && previousCapabilitiesSuppressedPresentation) {
    return previousCapabilitiesSuppressedPresentation;
  }

  return null;
}

function isStableRouteBootstrapStatus(status: RouteBootstrapStatus): boolean {
  return status !== 'pending';
}
