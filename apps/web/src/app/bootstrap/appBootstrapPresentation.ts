/** Owned concern: derive bootstrap startup presentation copy, transitions, and progress snapshots without touching the DOM. */
import { resolveAppBootstrapCopy, type AppBootstrapCopy } from './appBootstrapCopy';
import type { BootstrapProgressSegment, BootstrapProgressSnapshot } from './bootstrapProgressBar';

export const BOOTSTRAP_STEP_ORDER = [
  'hydrate',
  'services',
  'capabilities',
  'health',
  'route',
] as const;

export type BootstrapStep = (typeof BOOTSTRAP_STEP_ORDER)[number];
export type BootstrapStepStatus =
  | 'pending'
  | 'complete'
  | 'degraded'
  | 'failed'
  | 'blocked'
  | 'error';
export type BootstrapScreenState = 'loading' | 'blocked' | 'error' | 'complete';

export type BootstrapStepState = Readonly<{
  status: BootstrapStepStatus;
  detail: string;
}>;

export type BootstrapStepStateById = Record<BootstrapStep, BootstrapStepState>;

export type BootstrapStepPresentation = Readonly<{
  id: BootstrapStep;
  label: string;
  status: BootstrapStepStatus;
  detail: string;
}>;

export type BootstrapScreenPresentation = Readonly<{
  state: BootstrapScreenState;
  title: string;
  message: string;
  announcement: Readonly<{
    label: string;
    text: string;
    busy: boolean;
  }>;
  steps: readonly BootstrapStepPresentation[];
  progress: BootstrapProgressSnapshot;
}>;

type BootstrapStepConfig = Readonly<{
  label: string;
  pendingDetail: string;
  completeDetail: string;
}>;

function resolveBootstrapStepConfig(
  copy: AppBootstrapCopy
): Record<BootstrapStep, BootstrapStepConfig> {
  return {
    hydrate: {
      label: copy.hydrateLabel,
      pendingDetail: copy.hydratePendingDetail,
      completeDetail: copy.hydrateCompleteDetail,
    },
    services: {
      label: copy.servicesLabel,
      pendingDetail: copy.servicesPendingDetail,
      completeDetail: copy.servicesCompleteDetail,
    },
    capabilities: {
      label: copy.capabilitiesLabel,
      pendingDetail: copy.capabilitiesPendingDetail,
      completeDetail: copy.capabilitiesCompleteDetail,
    },
    health: {
      label: copy.healthLabel,
      pendingDetail: copy.healthPendingDetail,
      completeDetail: copy.healthCompleteDetail,
    },
    route: {
      label: copy.routeLabel,
      pendingDetail: copy.routePendingDetail,
      completeDetail: copy.routeCompleteDetail,
    },
  };
}

export function createInitialBootstrapStepState(
  copy: AppBootstrapCopy = resolveAppBootstrapCopy()
): BootstrapStepStateById {
  return {
    hydrate: createBootstrapStepState('hydrate', 'pending', undefined, copy),
    services: createBootstrapStepState('services', 'pending', undefined, copy),
    capabilities: createBootstrapStepState('capabilities', 'pending', undefined, copy),
    health: createBootstrapStepState('health', 'pending', undefined, copy),
    route: createBootstrapStepState('route', 'pending', undefined, copy),
  };
}

export function createBootstrapStepState(
  step: BootstrapStep,
  status: BootstrapStepStatus,
  detail: string | undefined = undefined,
  copy: AppBootstrapCopy = resolveAppBootstrapCopy()
): BootstrapStepState {
  return {
    status,
    detail: detail ?? resolveBootstrapStepDetail(step, status, copy),
  };
}

export function resolveBootstrapStepDetail(
  step: BootstrapStep,
  status: BootstrapStepStatus,
  copy: AppBootstrapCopy = resolveAppBootstrapCopy()
): string {
  const stepConfig = resolveBootstrapStepConfig(copy)[step];

  switch (status) {
    case 'complete':
      return stepConfig.completeDetail;
    case 'degraded':
      return `${stepConfig.label} ${copy.degradedStepDetailSuffix}`;
    case 'failed':
      return `${stepConfig.label} ${copy.failedStepDetailSuffix}`;
    case 'blocked':
      return `${stepConfig.label} ${copy.blockedStepDetailSuffix}`;
    case 'error':
      return `${stepConfig.label} ${copy.errorStepDetailSuffix}`;
    case 'pending':
    default:
      return stepConfig.pendingDetail;
  }
}

export function resolveBootstrapScreenPresentation(
  stepState: BootstrapStepStateById,
  copy: AppBootstrapCopy = resolveAppBootstrapCopy()
): BootstrapScreenPresentation {
  const state = resolveBootstrapScreenState(stepState);
  const { title, message } = resolveBootstrapScreenCopy(state, stepState, copy);

  return {
    state,
    title,
    message,
    announcement: {
      label: copy.startupStatusLabel,
      text: `${title}. ${message}`,
      busy: state !== 'complete',
    },
    steps: resolveBootstrapStepPresentations(stepState, copy),
    progress: resolveBootstrapProgressSnapshot(state, stepState, copy),
  };
}

export function canCompleteBootstrapSteps(stepState: BootstrapStepStateById): boolean {
  return BOOTSTRAP_STEP_ORDER.every((step) =>
    isBootstrapStepStartupAllowed(stepState[step].status)
  );
}

export function formatBootstrapBuildDate(isoString: string): string {
  const parsedDate = new Date(isoString);
  if (Number.isNaN(parsedDate.getTime())) {
    return isoString;
  }

  const canonicalIso = parsedDate.toISOString();
  return `${canonicalIso.slice(0, 10)} ${canonicalIso.slice(11, 16)} UTC`;
}

function resolveBootstrapScreenState(stepState: BootstrapStepStateById): BootstrapScreenState {
  if (hasStepWithStatus(stepState, 'error')) {
    return 'error';
  }

  if (hasStepWithStatus(stepState, 'blocked')) {
    return 'blocked';
  }

  return canCompleteBootstrapSteps(stepState) ? 'complete' : 'loading';
}

function resolveBootstrapScreenCopy(
  state: BootstrapScreenState,
  stepState: BootstrapStepStateById,
  copy: AppBootstrapCopy
): Readonly<{ title: string; message: string }> {
  switch (state) {
    case 'error':
      return {
        title: copy.errorTitle,
        message: findLatestStepDetail(stepState, 'error') ?? copy.errorMessageFallback,
      };
    case 'blocked':
      return {
        title: copy.blockedTitle,
        message: findLatestStepDetail(stepState, 'blocked') ?? copy.blockedMessageFallback,
      };
    case 'complete':
      return {
        title: copy.completeTitle,
        message: copy.completeMessage,
      };
    case 'loading':
    default:
      return {
        title: copy.preparingTitle,
        message: copy.preparingMessage,
      };
  }
}

function resolveBootstrapStepPresentations(
  stepState: BootstrapStepStateById,
  copy: AppBootstrapCopy
): readonly BootstrapStepPresentation[] {
  const stepConfig = resolveBootstrapStepConfig(copy);
  return BOOTSTRAP_STEP_ORDER.map((step) => ({
    id: step,
    label: stepConfig[step].label,
    status: stepState[step].status,
    detail: stepState[step].detail,
  }));
}

function resolveBootstrapProgressSnapshot(
  state: BootstrapScreenState,
  stepState: BootstrapStepStateById,
  copy: AppBootstrapCopy
): BootstrapProgressSnapshot {
  const progressValue = BOOTSTRAP_STEP_ORDER.filter((step) =>
    isBootstrapStepStartupAllowed(stepState[step].status)
  ).length;
  const settledCount = state === 'complete' ? BOOTSTRAP_STEP_ORDER.length : progressValue;
  const label = resolveBootstrapProgressLabel(state, progressValue, copy);
  const segments = resolveBootstrapProgressSegments(stepState, copy);

  return {
    tone: state,
    label,
    kicker: copy.progressKicker,
    listLabel: copy.progressListLabel,
    countLabel: `${settledCount}/${BOOTSTRAP_STEP_ORDER.length} ${copy.progressCountSuffix}`,
    settledCount,
    totalCount: BOOTSTRAP_STEP_ORDER.length,
    segments,
  };
}

function resolveBootstrapProgressLabel(
  state: BootstrapScreenState,
  settledSteps: number,
  copy: AppBootstrapCopy
): string {
  const label = `${settledSteps}/${BOOTSTRAP_STEP_ORDER.length} ${copy.progressSettledLabel}`;

  if (state === 'blocked') {
    return `${label}. ${copy.progressBlockedSuffix}`;
  }

  if (state === 'error') {
    return `${label}. ${copy.progressErrorSuffix}`;
  }

  return label;
}

function resolveBootstrapProgressSegments(
  stepState: BootstrapStepStateById,
  copy: AppBootstrapCopy
): readonly BootstrapProgressSegment[] {
  const stepConfig = resolveBootstrapStepConfig(copy);
  return BOOTSTRAP_STEP_ORDER.map((step) => ({
    id: step,
    label: stepConfig[step].label,
    status: stepState[step].status,
  }));
}

function hasStepWithStatus(
  stepState: BootstrapStepStateById,
  status: BootstrapStepStatus
): boolean {
  return BOOTSTRAP_STEP_ORDER.some((step) => stepState[step].status === status);
}

function findLatestStepDetail(
  stepState: BootstrapStepStateById,
  status: BootstrapStepStatus
): string | null {
  for (const step of [...BOOTSTRAP_STEP_ORDER].reverse()) {
    if (stepState[step].status === status) {
      return stepState[step].detail;
    }
  }

  return null;
}

function isBootstrapStepStartupAllowed(status: BootstrapStepStatus): boolean {
  return status === 'complete' || status === 'degraded' || status === 'failed';
}
