/** Owned concern: declare the typed DOM contract for the pre-React bootstrap shell. */
import type { BootstrapStep } from './appBootstrapPresentation';

export type BootstrapTextTarget = keyof typeof BOOTSTRAP_DOM.textTargetIds;
export type BootstrapMetaTarget = keyof typeof BOOTSTRAP_DOM.metaTargetIds;

export const BOOTSTRAP_DOM = {
  screenId: 'app-loading-screen',
  announcementId: 'app-loading-announcement',
  progressId: 'app-loading-progress',
  detailSelector: '[data-bootstrap-detail]',
  textTargetIds: {
    title: 'app-loading-title',
    message: 'app-loading-message',
    version: 'app-loading-version',
  },
  metaTargetIds: {
    buildDate: 'app-loading-build-date',
  },
  screenFallbackAriaAttributes: [
    'role',
    'aria-label',
    'aria-live',
    'aria-atomic',
    'aria-busy',
    'aria-describedby',
  ],
  announcementAriaAttributes: {
    live: 'polite',
    atomic: 'true',
  },
} as const;

export function getBootstrapStepSelector(step: BootstrapStep): string {
  return `[data-bootstrap-step="${step}"]`;
}

export function getBootstrapAnnouncementDescription(): string {
  return `${BOOTSTRAP_DOM.textTargetIds.message} ${BOOTSTRAP_DOM.progressId}`;
}
