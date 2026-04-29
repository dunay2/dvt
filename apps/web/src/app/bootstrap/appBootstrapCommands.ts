/** Owned concern: define app-bootstrap command objects and factories for shell publishers. */
import type { RouteBootstrapPresentation } from './routeBootstrapContract';
import { resolveAppBootstrapCopy, type AppBootstrapCopy } from './appBootstrapCopy';
import type { BootstrapStep, BootstrapStepStatus } from './appBootstrapPresentation';

export type BootstrapStepStatusCommand = Readonly<{
  step: BootstrapStep;
  status: BootstrapStepStatus;
  detail?: string;
}>;

export type BootstrapFailureCommand = Readonly<{
  message: string;
}>;

type CopyResolverArgs = Readonly<{
  copy?: AppBootstrapCopy;
}>;

type HealthCommandArgs = CopyResolverArgs &
  Readonly<{
    detail?: string | null;
  }>;

function getCopy(copy?: AppBootstrapCopy): AppBootstrapCopy {
  return copy ?? resolveAppBootstrapCopy();
}

export function createHydrationCompleteBootstrapCommand(): BootstrapStepStatusCommand {
  return {
    step: 'hydrate',
    status: 'complete',
  };
}

export function createServicesReadyBootstrapCommand({
  copy,
}: CopyResolverArgs = {}): BootstrapStepStatusCommand {
  return {
    step: 'services',
    status: 'complete',
    detail: getCopy(copy).servicesCompleteDetail,
  };
}

export function createCapabilitiesPendingBootstrapCommand(): BootstrapStepStatusCommand {
  return {
    step: 'capabilities',
    status: 'pending',
  };
}

export function createCapabilitiesFallbackBootstrapCommand({
  copy,
}: CopyResolverArgs = {}): BootstrapStepStatusCommand {
  return {
    step: 'capabilities',
    status: 'degraded',
    detail: getCopy(copy).capabilitiesFallbackDetail,
  };
}

export function createCapabilitiesReadyBootstrapCommand(): BootstrapStepStatusCommand {
  return {
    step: 'capabilities',
    status: 'complete',
  };
}

export function createHealthPendingBootstrapCommand(): BootstrapStepStatusCommand {
  return {
    step: 'health',
    status: 'pending',
  };
}

export function createHealthFailedBootstrapCommand({
  copy,
  detail,
}: HealthCommandArgs = {}): BootstrapStepStatusCommand {
  return {
    step: 'health',
    status: 'failed',
    detail: detail ?? getCopy(copy).healthFailureFallbackDetail,
  };
}

export function createHealthDegradedBootstrapCommand({
  copy,
  detail,
}: HealthCommandArgs = {}): BootstrapStepStatusCommand {
  return {
    step: 'health',
    status: 'degraded',
    detail: detail ?? getCopy(copy).healthFailureFallbackDetail,
  };
}

export function createHealthReadyBootstrapCommand({
  copy,
  detail,
}: HealthCommandArgs = {}): BootstrapStepStatusCommand {
  return {
    step: 'health',
    status: 'complete',
    detail: detail ?? getCopy(copy).healthCompleteDetail,
  };
}

export function createRouteBootstrapStepCommand(
  presentation: RouteBootstrapPresentation
): BootstrapStepStatusCommand {
  return {
    step: 'route',
    status: presentation.status,
    detail: presentation.detail,
  };
}

export function createBootstrapFailureCommand(message: string): BootstrapFailureCommand {
  return { message };
}
