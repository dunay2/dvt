type BootstrapStep = 'hydrate' | 'services' | 'capabilities' | 'health' | 'route';
type BootstrapStepStatus = 'pending' | 'complete' | 'degraded' | 'blocked' | 'error';
type BootstrapScreenState = 'loading' | 'blocked' | 'error' | 'complete';

const LOADING_SCREEN_ID = 'app-loading-screen';
const TITLE_ID = 'app-loading-title';
const MESSAGE_ID = 'app-loading-message';
const LOG_ID = 'app-loading-log';
const MAX_LOG_ENTRIES = 12;

type BootstrapStepConfig = {
  label: string;
  pendingDetail: string;
  completeDetail: string;
};

type BootstrapStepState = {
  status: BootstrapStepStatus;
  detail: string;
};

type BootstrapLogEntry = {
  id: number;
  timestamp: string;
  step: BootstrapStep | 'system';
  status: BootstrapStepStatus | 'info';
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
let bootstrapLogEntries: BootstrapLogEntry[] = [];
let bootstrapLogSequence = 0;

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

function getLogNode(): HTMLOListElement | null {
  return document.getElementById(LOG_ID) as HTMLOListElement | null;
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

function renderBootstrapLog(): void {
  const logNode = getLogNode();
  if (!logNode) {
    return;
  }

  logNode.innerHTML = '';
  bootstrapLogEntries.forEach((entry) => {
    const item = document.createElement('li');
    item.dataset.logStatus = entry.status;

    const time = document.createElement('span');
    time.className = 'app-loading-log-time';
    time.textContent = entry.timestamp;

    const message = document.createElement('span');
    message.className = 'app-loading-log-message';
    message.textContent =
      entry.step === 'system'
        ? entry.detail
        : `${STEP_CONFIG[entry.step].label}: ${entry.detail}`;

    item.append(time, message);
    logNode.append(item);
  });
}

function appendBootstrapLog(
  step: BootstrapStep | 'system',
  status: BootstrapStepStatus | 'info',
  detail: string
): void {
  bootstrapLogSequence += 1;
  bootstrapLogEntries = [
    ...bootstrapLogEntries.slice(-(MAX_LOG_ENTRIES - 1)),
    {
      id: bootstrapLogSequence,
      timestamp: new Date().toISOString().slice(11, 19),
      step,
      status,
      detail,
    },
  ];
  renderBootstrapLog();
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

export function startBootstrapScreen(): void {
  if (!getLoadingScreen()) {
    return;
  }

  bootstrapStepState = createInitialStepState();
  bootstrapLogEntries = [];
  bootstrapLogSequence = 0;

  setBootstrapScreenState('loading', PREPARING_TITLE, PREPARING_MESSAGE);

  STEP_ORDER.forEach((step) => {
    writeStepStateToDom(step);
  });

  renderBootstrapLog();
  appendBootstrapLog('system', 'info', 'Bootstrap started. Waiting for startup modules.');
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
  appendBootstrapLog(step, status, resolvedDetail);
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
