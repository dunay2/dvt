/** Owned concern: derive bootstrap startup presentation copy, transitions, and progress snapshots without touching the DOM. */
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

const STARTUP_STATUS_LABEL = 'Raven startup status';
const PREPARING_TITLE = 'Preparing Raven';
const PREPARING_MESSAGE =
  'Loading startup modules in order. The workspace opens once bootstrap settles.';
const BLOCKED_TITLE = 'Raven is waiting for startup prerequisites';
const BLOCKED_MESSAGE_FALLBACK =
  'Startup is blocked until the required platform prerequisites are available.';
const ERROR_TITLE = 'Raven could not finish startup';
export const BOOTSTRAP_ERROR_MESSAGE_FALLBACK = 'An unexpected startup error occurred.';
const COMPLETE_TITLE = 'Raven is ready';
const COMPLETE_MESSAGE = 'Opening the workspace.';

const BOOTSTRAP_STEP_CONFIG: Record<BootstrapStep, BootstrapStepConfig> = {
  hydrate: {
    label: 'Hydrating application',
    pendingDetail: 'Mounting the Raven shell',
    completeDetail: 'Application shell mounted',
  },
  services: {
    label: 'Preparing app services',
    pendingDetail: 'Building app services and query client',
    completeDetail: 'App services and query client ready',
  },
  capabilities: {
    label: 'Loading runtime capabilities',
    pendingDetail: 'Resolving enabled plugins and workspace surfaces',
    completeDetail: 'Runtime capabilities loaded',
  },
  health: {
    label: 'Checking platform health',
    pendingDetail: 'Polling health and readiness endpoints',
    completeDetail: 'Platform health settled',
  },
  route: {
    label: 'Preparing initial route',
    pendingDetail: 'Preparing the active workspace surface',
    completeDetail: 'Initial route is ready',
  },
};

export function createInitialBootstrapStepState(): BootstrapStepStateById {
  return {
    hydrate: createBootstrapStepState('hydrate', 'pending'),
    services: createBootstrapStepState('services', 'pending'),
    capabilities: createBootstrapStepState('capabilities', 'pending'),
    health: createBootstrapStepState('health', 'pending'),
    route: createBootstrapStepState('route', 'pending'),
  };
}

export function createBootstrapStepState(
  step: BootstrapStep,
  status: BootstrapStepStatus,
  detail = resolveBootstrapStepDetail(step, status)
): BootstrapStepState {
  return {
    status,
    detail,
  };
}

export function resolveBootstrapStepDetail(
  step: BootstrapStep,
  status: BootstrapStepStatus
): string {
  const stepConfig = BOOTSTRAP_STEP_CONFIG[step];

  switch (status) {
    case 'complete':
      return stepConfig.completeDetail;
    case 'degraded':
      return `${stepConfig.label} settled with degraded startup conditions.`;
    case 'failed':
      return `${stepConfig.label} failed but does not block shell startup.`;
    case 'blocked':
      return `${stepConfig.label} is blocked by a required startup prerequisite.`;
    case 'error':
      return `${stepConfig.label} failed during startup.`;
    case 'pending':
    default:
      return stepConfig.pendingDetail;
  }
}

export function resolveBootstrapScreenPresentation(
  stepState: BootstrapStepStateById
): BootstrapScreenPresentation {
  const state = resolveBootstrapScreenState(stepState);
  const { title, message } = resolveBootstrapScreenCopy(state, stepState);

  return {
    state,
    title,
    message,
    announcement: {
      label: STARTUP_STATUS_LABEL,
      text: `${title}. ${message}`,
      busy: state !== 'complete',
    },
    steps: resolveBootstrapStepPresentations(stepState),
    progress: resolveBootstrapProgressSnapshot(state, stepState),
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
  stepState: BootstrapStepStateById
): Readonly<{ title: string; message: string }> {
  switch (state) {
    case 'error':
      return {
        title: ERROR_TITLE,
        message: findLatestStepDetail(stepState, 'error') ?? BOOTSTRAP_ERROR_MESSAGE_FALLBACK,
      };
    case 'blocked':
      return {
        title: BLOCKED_TITLE,
        message: findLatestStepDetail(stepState, 'blocked') ?? BLOCKED_MESSAGE_FALLBACK,
      };
    case 'complete':
      return {
        title: COMPLETE_TITLE,
        message: COMPLETE_MESSAGE,
      };
    case 'loading':
    default:
      return {
        title: PREPARING_TITLE,
        message: PREPARING_MESSAGE,
      };
  }
}

function resolveBootstrapStepPresentations(
  stepState: BootstrapStepStateById
): readonly BootstrapStepPresentation[] {
  return BOOTSTRAP_STEP_ORDER.map((step) => ({
    id: step,
    label: BOOTSTRAP_STEP_CONFIG[step].label,
    status: stepState[step].status,
    detail: stepState[step].detail,
  }));
}

function resolveBootstrapProgressSnapshot(
  state: BootstrapScreenState,
  stepState: BootstrapStepStateById
): BootstrapProgressSnapshot {
  const progressValue = BOOTSTRAP_STEP_ORDER.filter((step) =>
    isBootstrapStepStartupAllowed(stepState[step].status)
  ).length;
  const settledCount = state === 'complete' ? BOOTSTRAP_STEP_ORDER.length : progressValue;
  const label = resolveBootstrapProgressLabel(state, progressValue);
  const segments = resolveBootstrapProgressSegments(stepState);

  return {
    tone: state,
    label,
    settledCount,
    totalCount: BOOTSTRAP_STEP_ORDER.length,
    segments,
  };
}

function resolveBootstrapProgressLabel(state: BootstrapScreenState, settledSteps: number): string {
  const label = `${settledSteps}/${BOOTSTRAP_STEP_ORDER.length} startup checks settled`;

  if (state === 'blocked') {
    return `${label}. Required startup blockers remain.`;
  }

  if (state === 'error') {
    return `${label}. Startup error needs attention.`;
  }

  return label;
}

function resolveBootstrapProgressSegments(
  stepState: BootstrapStepStateById
): readonly BootstrapProgressSegment[] {
  return BOOTSTRAP_STEP_ORDER.map((step) => ({
    id: step,
    label: BOOTSTRAP_STEP_CONFIG[step].label,
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
