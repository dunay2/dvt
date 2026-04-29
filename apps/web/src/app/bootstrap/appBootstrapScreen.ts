/** Owned concern: apply resolved pre-React bootstrap presentation snapshots to the startup DOM. */
import {
  BOOTSTRAP_ERROR_MESSAGE_FALLBACK,
  BOOTSTRAP_STEP_ORDER,
  canCompleteBootstrapSteps,
  createBootstrapStepState,
  createInitialBootstrapStepState,
  formatBootstrapBuildDate,
  resolveBootstrapScreenPresentation,
  type BootstrapScreenPresentation,
  type BootstrapStep,
  type BootstrapStepPresentation,
  type BootstrapStepStateById,
  type BootstrapStepStatus,
} from './appBootstrapPresentation';
import { renderBootstrapProgress } from './bootstrapProgressBar';

const LOADING_SCREEN_ID = 'app-loading-screen';
const ANNOUNCEMENT_ID = 'app-loading-announcement';
const TITLE_ID = 'app-loading-title';
const MESSAGE_ID = 'app-loading-message';
const VERSION_ID = 'app-loading-version';
const BUILD_DATE_ID = 'app-loading-build-date';
const PROGRESS_ID = 'app-loading-progress';

let bootstrapStepState: BootstrapStepStateById = createInitialBootstrapStepState();

function getLoadingScreen(): HTMLElement | null {
  return document.getElementById(LOADING_SCREEN_ID);
}

function getLoadingAnnouncement(): HTMLOutputElement | null {
  return document.querySelector<HTMLOutputElement>(`#${ANNOUNCEMENT_ID}`);
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

function setBootstrapMetaItem(id: string, text: string, visible: boolean): void {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }

  node.textContent = text;
  node.hidden = !visible;
}

function writeStepPresentationToDom(stepPresentation: BootstrapStepPresentation): void {
  const node = getStepNode(stepPresentation.id);
  if (!node) {
    return;
  }

  node.dataset.status = stepPresentation.status;
  const detailNode = node.querySelector<HTMLElement>('[data-bootstrap-detail]');
  if (detailNode) {
    detailNode.textContent = stepPresentation.detail;
  }
}

function updateBootstrapAnnouncement(presentation: BootstrapScreenPresentation): void {
  const announcement = getLoadingAnnouncement();
  if (!announcement) {
    return;
  }

  announcement.setAttribute('aria-label', presentation.announcement.label);
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('aria-busy', presentation.announcement.busy ? 'true' : 'false');
  announcement.setAttribute('aria-describedby', `${MESSAGE_ID} ${PROGRESS_ID}`);
  announcement.textContent = presentation.announcement.text;
}

function clearScreenAriaFallbackAttributes(screen: HTMLElement): void {
  screen.removeAttribute('role');
  screen.removeAttribute('aria-label');
  screen.removeAttribute('aria-live');
  screen.removeAttribute('aria-atomic');
  screen.removeAttribute('aria-busy');
  screen.removeAttribute('aria-describedby');
}

function renderBootstrapScreenPresentation(presentation: BootstrapScreenPresentation): void {
  const screen = getLoadingScreen();
  if (!screen) {
    return;
  }

  screen.dataset.state = presentation.state;
  clearScreenAriaFallbackAttributes(screen);
  updateBootstrapText(TITLE_ID, presentation.title);
  updateBootstrapText(MESSAGE_ID, presentation.message);
  updateBootstrapAnnouncement(presentation);
  presentation.steps.forEach(writeStepPresentationToDom);
  renderBootstrapProgress(presentation.progress);
}

function syncBootstrapScreenState(): void {
  renderBootstrapScreenPresentation(resolveBootstrapScreenPresentation(bootstrapStepState));
}

function updateBootstrapBuildMeta(): void {
  const appVersion = import.meta.env.VITE_APP_VERSION?.trim() || '0.0.0';
  const rawBuildDate = import.meta.env.VITE_APP_BUILD_DATE?.trim() || '';

  updateBootstrapText(VERSION_ID, `Version ${appVersion}`);
  setBootstrapMetaItem(
    BUILD_DATE_ID,
    rawBuildDate.length > 0 ? `Build ${formatBootstrapBuildDate(rawBuildDate)}` : '',
    rawBuildDate.length > 0
  );
}

export function startBootstrapScreen(): void {
  if (!getLoadingScreen()) {
    return;
  }

  bootstrapStepState = createInitialBootstrapStepState();
  syncBootstrapScreenState();
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
  const nextStepState = createBootstrapStepState(step, status, detail);
  const previousState = bootstrapStepState[step];

  if (
    previousState.status === nextStepState.status &&
    previousState.detail === nextStepState.detail
  ) {
    syncBootstrapScreenState();
    return;
  }

  bootstrapStepState = {
    ...bootstrapStepState,
    [step]: nextStepState,
  };

  syncBootstrapScreenState();
}

export function showBootstrapFailure(message: string): void {
  if (!getLoadingScreen()) {
    return;
  }

  setBootstrapStepStatus('route', 'error', message || BOOTSTRAP_ERROR_MESSAGE_FALLBACK);
}

export function completeBootstrapScreen(): void {
  const screen = getLoadingScreen();
  if (!screen || !canCompleteBootstrapSteps(bootstrapStepState)) {
    return;
  }

  syncBootstrapScreenState();
  globalThis.setTimeout(() => {
    if (screen.dataset.state === 'complete') {
      screen.remove();
    }
  }, 120);
}
