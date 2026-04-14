import { renderBootstrapProgress } from './bootstrapProgressBar';

type BootstrapStep = 'hydrate' | 'services' | 'capabilities' | 'health' | 'route';
type BootstrapStepStatus = 'pending' | 'complete' | 'degraded' | 'blocked' | 'error';
type BootstrapScreenState = 'loading' | 'blocked' | 'error' | 'complete';

const LOADING_SCREEN_ID = 'app-loading-screen';
const TITLE_ID = 'app-loading-title';
const MESSAGE_ID = 'app-loading-message';
const VERSION_ID = 'app-loading-version';
const BUILD_DATE_ID = 'app-loading-build-date';

type BootstrapStepConfig = {
  label: string;
  pendingDetail: string;
  completeDetail: string;
};

type BootstrapStepState = {
  status: BootstrapStepStatus;
  detail: string;
};

const STEP_ORDER: BootstrapStep[] = ['hydrate', 'services', 'capabilities', 'health', 'route'];
const PREPARING_TITLE = 'Preparing Raven';
const PREPARING_MESSAGE =
  'Loading startup modules in order. The workspace opens once bootstrap settles.';
const BLOCKED_TITLE = 'Raven is waiting for startup prerequisites';
const BLOCKED_MESSAGE_FALLBACK =
  'Startup is blocked until the required platform prerequisites are available.';
const ERROR_TITLE = 'Raven could not finish startup';
const ERROR_MESSAGE_FALLBACK = 'An unexpected startup error occurred.';

const STEP_CONFIG: Record<BootstrapStep, BootstrapStepConfig> = {
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

let bootstrapStepState = createInitialStepState();

function createInitialStepState(): Record<BootstrapStep, BootstrapStepState> {
  return STEP_ORDER.reduce<Record<BootstrapStep, BootstrapStepState>>((state, step) => {
    state[step] = {
      status: 'pending',
      detail: STEP_CONFIG[step].pendingDetail,
    };
    return state;
  }, {} as Record<BootstrapStep, BootstrapStepState>);
}

function getLoadingScreen(): HTMLElement | null {
  return document.getElementById(LOADING_SCREEN_ID);
}

function getStepNode(step: BootstrapStep): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-bootstrap-step="${step}"]`);
}

function updateBootstrapText(id: string, text: string): void {
  const node = document.getElementById(id);
  if (node) {
    node.textContent = text;
  }
}

function getDefaultDetail(step: BootstrapStep, status: BootstrapStepStatus): string {
  switch (status) {
    case 'complete':
      return STEP_CONFIG[step].completeDetail;
    case 'degraded':
      return `${STEP_CONFIG[step].label} settled with degraded startup conditions.`;
    case 'blocked':
      return `${STEP_CONFIG[step].label} is blocked by a required startup prerequisite.`;
    case 'error':
      return `${STEP_CONFIG[step].label} failed during startup.`;
    case 'pending':
    default:
      return STEP_CONFIG[step].pendingDetail;
  }
}

function writeStepStateToDom(step: BootstrapStep): void {
  const node = getStepNode(step);
  if (!node) {
    return;
  }

  const state = bootstrapStepState[step];
  node.dataset.status = state.status;
  const detailNode = node.querySelector<HTMLElement>('[data-bootstrap-detail]');
  if (detailNode) {
    detailNode.textContent = state.detail;
  }
}

function findLatestStepDetail(status: BootstrapStepStatus): string | null {
  for (let index = STEP_ORDER.length - 1; index >= 0; index -= 1) {
    const step = STEP_ORDER[index];
    if (!step) {
      continue;
    }

    const stepState = bootstrapStepState[step];
    if (stepState.status === status) {
      return stepState.detail;
    }
  }

  return null;
}

function getStepProgressUnits(status: BootstrapStepStatus): number {
  switch (status) {
    case 'complete':
    case 'degraded':
      return 1;
    case 'blocked':
    case 'error':
      return 0.85;
    case 'pending':
    default:
      return 0;
  }
}

function renderBootstrapProgressState(state: BootstrapScreenState): void {
  const settledSteps = STEP_ORDER.filter((step) => {
    const stepStatus = bootstrapStepState[step].status;
    return stepStatus === 'complete' || stepStatus === 'degraded';
  }).length;

  const progressValue = STEP_ORDER.reduce((total, step) => {
    return total + getStepProgressUnits(bootstrapStepState[step].status);
  }, 0);

  let label = `${settledSteps}/${STEP_ORDER.length} startup steps settled`;
  if (state === 'blocked') {
    label = `${label}. Waiting on a required prerequisite.`;
  }
  if (state === 'error') {
    label = `${label}. A startup error needs attention.`;
  }

  renderBootstrapProgress({
    value: state === 'complete' ? STEP_ORDER.length : progressValue,
    max: STEP_ORDER.length,
    tone: state,
    label,
  });
}

function setBootstrapScreenState(
  state: BootstrapScreenState,
  title: string,
  message: string
): void {
  const screen = getLoadingScreen();
  if (!screen) {
    return;
  }

  screen.dataset.state = state;
  updateBootstrapText(TITLE_ID, title);
  updateBootstrapText(MESSAGE_ID, message);
  renderBootstrapProgressState(state);
}

function syncBootstrapScreenState(): void {
  if (STEP_ORDER.some((step) => bootstrapStepState[step].status === 'error')) {
    setBootstrapScreenState('error', ERROR_TITLE, findLatestStepDetail('error') ?? ERROR_MESSAGE_FALLBACK);
    return;
  }

  if (STEP_ORDER.some((step) => bootstrapStepState[step].status === 'blocked')) {
    setBootstrapScreenState(
      'blocked',
      BLOCKED_TITLE,
      findLatestStepDetail('blocked') ?? BLOCKED_MESSAGE_FALLBACK
    );
    return;
  }

  setBootstrapScreenState('loading', PREPARING_TITLE, PREPARING_MESSAGE);
}

function canCompleteBootstrap(): boolean {
  return STEP_ORDER.every((step) => {
    const status = bootstrapStepState[step].status;
    return status === 'complete' || status === 'degraded';
  });
}

function formatBuildDate(isoString: string): string {
  const parsedDate = new Date(isoString);
  if (Number.isNaN(parsedDate.getTime())) {
    return isoString;
  }

  const canonicalIso = parsedDate.toISOString();
  return `${canonicalIso.slice(0, 10)} ${canonicalIso.slice(11, 16)} UTC`;
}

function updateBootstrapBuildMeta(): void {
  const appVersion = import.meta.env.VITE_APP_VERSION?.trim() || '0.0.0';
  const rawBuildDate = import.meta.env.VITE_APP_BUILD_DATE?.trim() || '';
  const buildDate = rawBuildDate.length > 0 ? formatBuildDate(rawBuildDate) : 'unknown';

  updateBootstrapText(VERSION_ID, `Version ${appVersion}`);
  updateBootstrapText(BUILD_DATE_ID, `Build ${buildDate}`);
}

export function startBootstrapScreen(): void {
  if (!getLoadingScreen()) {
    return;
  }

  bootstrapStepState = createInitialStepState();

  setBootstrapScreenState('loading', PREPARING_TITLE, PREPARING_MESSAGE);

  STEP_ORDER.forEach((step) => {
    writeStepStateToDom(step);
  });

  updateBootstrapBuildMeta();
}

export function isBootstrapScreenVisible(): boolean {
  const screen = getLoadingScreen();
  return screen !== null && screen.dataset.state !== 'complete';
}

export function setBootstrapStepStatus(
  step: BootstrapStep,
  status: BootstrapStepStatus,
  detail?: string
): void {
  const resolvedDetail = detail ?? getDefaultDetail(step, status);
  const previousState = bootstrapStepState[step];

  if (previousState.status === status && previousState.detail === resolvedDetail) {
    syncBootstrapScreenState();
    return;
  }

  bootstrapStepState = {
    ...bootstrapStepState,
    [step]: {
      status,
      detail: resolvedDetail,
    },
  };

  writeStepStateToDom(step);
  syncBootstrapScreenState();
}

export function showBootstrapFailure(message: string): void {
  if (!getLoadingScreen()) {
    return;
  }

  setBootstrapStepStatus('route', 'error', message || ERROR_MESSAGE_FALLBACK);
}

export function completeBootstrapScreen(): void {
  const screen = getLoadingScreen();
  if (!screen || !canCompleteBootstrap()) {
    return;
  }

  setBootstrapScreenState('complete', 'Raven is ready', 'Opening the workspace.');
  globalThis.setTimeout(() => {
    if (screen.dataset.state === 'complete') {
      screen.remove();
    }
  }, 120);
}
