/** Owned concern: resolve locale-aware copy for shared run-event feed health. */
import type { RunEventFeedHealthState } from './runEventFeedHealthModel';

type VisibleRunEventFeedHealthState = Exclude<RunEventFeedHealthState, 'idle'>;

export type RunEventFeedHealthCopy = {
  readonly states: Readonly<Record<VisibleRunEventFeedHealthState, string>>;
  readonly messages: Readonly<Record<RunEventFeedHealthState, string>>;
  readonly runLabel: string;
  readonly terminalLoading: string;
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
  runLabel: 'Run',
  terminalLoading: 'Loading terminal...',
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
    idle: 'Inicia una ejecución para ver aquí sus eventos en directo.',
    loading: 'Cargando eventos de ejecución...',
    live: 'Los eventos de ejecución están en directo.',
    degraded:
      'La actualización de eventos está degradada temporalmente. Los eventos recibidos siguen visibles.',
    complete: 'El flujo de eventos de ejecución está completo.',
    failed: 'No se pudieron cargar los eventos de ejecución.',
  },
  runLabel: 'Ejecución',
  terminalLoading: 'Cargando terminal...',
  retryAction: 'Reintentar eventos',
};

export function resolveRunEventFeedHealthCopy(locale: string): RunEventFeedHealthCopy {
  return locale.trim().toLowerCase().startsWith('es') ? COPY_ES : COPY_EN;
}
