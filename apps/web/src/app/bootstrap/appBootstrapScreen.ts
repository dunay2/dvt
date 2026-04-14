type BootstrapStep = 'hydrate' | 'capabilities' | 'health' | 'route';
type BootstrapStepStatus = 'pending' | 'complete' | 'error';

const LOADING_SCREEN_ID = 'app-loading-screen';
const TITLE_ID = 'app-loading-title';
const MESSAGE_ID = 'app-loading-message';

type BootstrapStepConfig = {
  label: string;
  pendingDetail: string;
  completeDetail: string;
};

const STEP_CONFIG: Record<BootstrapStep, BootstrapStepConfig> = {
  hydrate: {
    label: 'Hydrating application',
    pendingDetail: 'Mounting the Raven shell',
    completeDetail: 'Application shell mounted',
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

export function startBootstrapScreen(): void {
  const screen = getLoadingScreen();
  if (!screen) {
    return;
  }

  screen.dataset.state = 'loading';
  updateBootstrapText(TITLE_ID, 'Preparing Raven');
  updateBootstrapText(
    MESSAGE_ID,
    'Loading startup modules in order. The workspace opens once bootstrap settles.'
  );

  (Object.keys(STEP_CONFIG) as BootstrapStep[]).forEach((step) => {
    const node = getStepNode(step);
    if (!node) {
      return;
    }

    node.dataset.status = 'pending';
    const detail = node.querySelector<HTMLElement>('[data-bootstrap-detail]');
    if (detail) {
      detail.textContent = STEP_CONFIG[step].pendingDetail;
    }
  });
}

export function isBootstrapScreenVisible(): boolean {
  return getLoadingScreen() !== null;
}

export function setBootstrapStepStatus(
  step: BootstrapStep,
  status: BootstrapStepStatus,
  detail?: string
): void {
  const node = getStepNode(step);
  if (!node) {
    return;
  }

  node.dataset.status = status;
  const detailNode = node.querySelector<HTMLElement>('[data-bootstrap-detail]');
  if (detailNode) {
    if (detail) {
      detailNode.textContent = detail;
      return;
    }

    detailNode.textContent =
      status === 'complete' ? STEP_CONFIG[step].completeDetail : STEP_CONFIG[step].pendingDetail;
  }
}

export function showBootstrapFailure(message: string): void {
  const screen = getLoadingScreen();
  if (!screen) {
    return;
  }

  screen.dataset.state = 'error';
  updateBootstrapText(TITLE_ID, 'Raven could not finish startup');
  updateBootstrapText(MESSAGE_ID, message);
  setBootstrapStepStatus('route', 'error', message);
}

export function completeBootstrapScreen(): void {
  const screen = getLoadingScreen();
  if (!screen) {
    return;
  }

  if (screen.dataset.state === 'error') {
    return;
  }

  const hasPendingStep = (Object.keys(STEP_CONFIG) as BootstrapStep[]).some((step) => {
    const node = getStepNode(step);
    return node?.dataset.status === 'pending';
  });
  if (hasPendingStep) {
    return;
  }

  screen.dataset.state = 'complete';
  window.setTimeout(() => {
    screen.remove();
  }, 120);
}
