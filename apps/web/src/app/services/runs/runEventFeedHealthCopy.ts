/** Owned concern: resolve locale-aware copy for shared run-event feed health. */
import type { RunEventFeedHealthState } from './runEventFeedHealthModel';

type VisibleRunEventFeedHealthState = Exclude<RunEventFeedHealthState, 'idle'>;

export type RunEventFeedHealthCopy = {
  readonly states: Readonly<Record<VisibleRunEventFeedHealthState, string>>;
  readonly messages: Readonly<Record<RunEventFeedHealthState, string>>;
  readonly retryAction: string;
};

const COPY_EN: RunEventFeedHealthCopy = {
  states: {
    loading: 'Loading',
    live: 'Live',
    degraded: 'Degraded',
    complete: 'Complete',
    failed: 'Failed',
  },
  messages: {
    idle: 'Start a run to see live run events here.',
    loading: 'Loading run events...',
    live: 'Run events are live.',
    degraded: 'Event updates are temporarily degraded. Previously received events remain visible.',
    complete: 'The run event feed is complete.',
    failed: 'Run events could not be loaded.',
  },
  retryAction: 'Retry event feed',
};

const COPY_ES: RunEventFeedHealthCopy = {
  states: {
    loading: 'Cargando',
    live: 'En directo',
    degraded: 'Degradado',
    complete: 'Completo',
    failed: 'Fallido',
  },
  messages: {
    idle: 'Inicia una ejecucion para ver aqui sus eventos en directo.',
    loading: 'Cargando eventos de ejecucion...',
    live: 'Los eventos de ejecucion estan en directo.',
    degraded:
      'La actualizacion de eventos esta degradada temporalmente. Los eventos recibidos siguen visibles.',
    complete: 'El flujo de eventos de ejecucion esta completo.',
    failed: 'No se pudieron cargar los eventos de ejecucion.',
  },
  retryAction: 'Reintentar eventos',
};

function detectLocale(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.language || navigator.languages?.[0] || 'en';
  }

  return 'en';
}

export function resolveRunEventFeedHealthCopy(
  locale: string = detectLocale()
): RunEventFeedHealthCopy {
  return locale.trim().toLowerCase().startsWith('es') ? COPY_ES : COPY_EN;
}
