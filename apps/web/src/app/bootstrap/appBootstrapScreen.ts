/** Owned concern: apply resolved pre-React bootstrap presentation snapshots to the startup DOM. */
import {
  canCompleteBootstrapSteps,
  createBootstrapStepState,
  createInitialBootstrapStepState,
  formatBootstrapBuildDate,
  resolveBootstrapScreenPresentation,
  type BootstrapScreenPresentation,
  type BootstrapStep,
  type BootstrapStepPresentation,
  type BootstrapStepStateById,
} from './appBootstrapPresentation';
import { resolveAppBootstrapCopy } from './appBootstrapCopy';
import type { BootstrapFailureCommand, BootstrapStepStatusCommand } from './appBootstrapCommands';
import {
  BOOTSTRAP_DOM,
  getBootstrapAnnouncementDescription,
  getBootstrapStepSelector,
  type BootstrapMetaTarget,
  type BootstrapTextTarget,
} from './appBootstrapDomContract';
import { renderBootstrapProgress } from './bootstrapProgressBar';

type BootstrapMetaPresentation = Readonly<{
  text: string;
  visible: boolean;
}>;

export type { BootstrapFailureCommand, BootstrapStepStatusCommand } from './appBootstrapCommands';

type BootstrapTextUpdate = Readonly<{
  target: BootstrapTextTarget;
  text: string;
}>;

type BootstrapMetaUpdate = Readonly<{
  target: BootstrapMetaTarget;
  presentation: BootstrapMetaPresentation;
}>;

let bootstrapStepState: BootstrapStepStateById = createInitialBootstrapStepState();

function getLoadingScreen(): HTMLElement | null {
  return document.getElementById(BOOTSTRAP_DOM.screenId);
}

function getLoadingAnnouncement(): HTMLOutputElement | null {
  return document.querySelector<HTMLOutputElement>(`#${BOOTSTRAP_DOM.announcementId}`);
}

function getStepNode(step: BootstrapStep): HTMLElement | null {
  return document.querySelector<HTMLElement>(getBootstrapStepSelector(step));
}

function updateBootstrapText({ target, text }: BootstrapTextUpdate): void {
  const node = document.getElementById(BOOTSTRAP_DOM.textTargetIds[target]);
  if (node) {
    node.textContent = text;
  }
}

function setBootstrapMetaItem({ target, presentation }: BootstrapMetaUpdate): void {
  const node = document.getElementById(BOOTSTRAP_DOM.metaTargetIds[target]);
  if (!node) {
    return;
  }

  node.textContent = presentation.text;
  node.hidden = !presentation.visible;
}

function writeStepPresentationToDom(stepPresentation: BootstrapStepPresentation): void {
  const node = getStepNode(stepPresentation.id);
  if (!node) {
    return;
  }

  node.dataset.status = stepPresentation.status;
  const detailNode = node.querySelector<HTMLElement>(BOOTSTRAP_DOM.detailSelector);
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
  announcement.setAttribute('aria-live', BOOTSTRAP_DOM.announcementAriaAttributes.live);
  announcement.setAttribute('aria-atomic', BOOTSTRAP_DOM.announcementAriaAttributes.atomic);
  announcement.setAttribute('aria-busy', presentation.announcement.busy ? 'true' : 'false');
  announcement.setAttribute('aria-describedby', getBootstrapAnnouncementDescription());
  announcement.textContent = presentation.announcement.text;
}

function clearScreenAriaFallbackAttributes(screen: HTMLElement): void {
  BOOTSTRAP_DOM.screenFallbackAriaAttributes.forEach((attribute) => {
    screen.removeAttribute(attribute);
  });
}

function renderBootstrapScreenPresentation(presentation: BootstrapScreenPresentation): void {
  const screen = getLoadingScreen();
  if (!screen) {
    return;
  }

  screen.dataset.state = presentation.state;
  clearScreenAriaFallbackAttributes(screen);
  updateBootstrapText({ target: 'title', text: presentation.title });
  updateBootstrapText({ target: 'message', text: presentation.message });
  updateBootstrapAnnouncement(presentation);
  presentation.steps.forEach(writeStepPresentationToDom);
  renderBootstrapProgress(presentation.progress);
}

function syncBootstrapScreenState(): void {
  renderBootstrapScreenPresentation(
    resolveBootstrapScreenPresentation(bootstrapStepState, resolveAppBootstrapCopy())
  );
}

function updateBootstrapBuildMeta(): void {
  const copy = resolveAppBootstrapCopy();
  const appVersion = import.meta.env.VITE_APP_VERSION?.trim() || '0.0.0';
  const rawBuildDate = import.meta.env.VITE_APP_BUILD_DATE?.trim() || '';

  updateBootstrapText({ target: 'version', text: `${copy.versionPrefix} ${appVersion}` });
  setBootstrapMetaItem({
    target: 'buildDate',
    presentation: {
      text:
        rawBuildDate.length > 0
          ? `${copy.buildPrefix} ${formatBootstrapBuildDate(rawBuildDate)}`
          : '',
      visible: rawBuildDate.length > 0,
    },
  });
}

export function startBootstrapScreen(): void {
  if (!getLoadingScreen()) {
    return;
  }

  bootstrapStepState = createInitialBootstrapStepState(resolveAppBootstrapCopy());
  syncBootstrapScreenState();
  updateBootstrapBuildMeta();
}

export function isBootstrapScreenVisible(): boolean {
  const screen = getLoadingScreen();
  return screen !== null && screen.dataset.state !== 'complete';
}

export function setBootstrapStepStatus({ step, status, detail }: BootstrapStepStatusCommand): void {
  const nextStepState = createBootstrapStepState(step, status, detail, resolveAppBootstrapCopy());
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

export function showBootstrapFailure({ message }: BootstrapFailureCommand): void {
  const copy = resolveAppBootstrapCopy();
  if (!getLoadingScreen()) {
    return;
  }

  setBootstrapStepStatus({
    step: 'route',
    status: 'error',
    detail: message || copy.errorMessageFallback,
  });
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
