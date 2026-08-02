import type { RunControlUnavailableReason } from '../../ports/runs';

export type RunControlCopy = Readonly<{
  cancel: string;
  recover: string;
  cancellationRequested: string;
  cancellationAlreadyRequested: string;
  cancellationAlreadyCompleted: string;
  recoveryStarted: (runId: string) => string;
  failure: (message: string) => string;
  unavailableReason: Record<RunControlUnavailableReason, string>;
}>;

const EN_COPY: RunControlCopy = {
  cancel: 'Cancel run',
  recover: 'Recover run',
  cancellationRequested: 'Cancellation requested.',
  cancellationAlreadyRequested: 'Cancellation was already requested.',
  cancellationAlreadyCompleted: 'The run is already cancelled.',
  recoveryStarted: (runId) => `Recovery started as ${runId}.`,
  failure: (message) => `Run command failed: ${message}`,
  unavailableReason: {
    cancellation_pending: 'Cancellation is already pending.',
    run_active: 'Recovery is available only after a run fails or is cancelled.',
    run_cancelled: 'The run is already cancelled.',
    run_completed: 'Completed runs cannot be cancelled or recovered.',
    run_terminal: 'This terminal run cannot be cancelled.',
    source_context_untrusted:
      'Recovery is unavailable because the original execution context cannot be verified.',
  },
};

const ES_COPY: RunControlCopy = {
  cancel: 'Cancelar ejecucion',
  recover: 'Recuperar ejecucion',
  cancellationRequested: 'Cancelacion solicitada.',
  cancellationAlreadyRequested: 'La cancelacion ya estaba solicitada.',
  cancellationAlreadyCompleted: 'La ejecucion ya esta cancelada.',
  recoveryStarted: (runId) => `Recuperacion iniciada como ${runId}.`,
  failure: (message) => `El comando de ejecucion ha fallado: ${message}`,
  unavailableReason: {
    cancellation_pending: 'La cancelacion ya esta pendiente.',
    run_active: 'La recuperacion solo esta disponible tras un fallo o cancelacion.',
    run_cancelled: 'La ejecucion ya esta cancelada.',
    run_completed: 'Las ejecuciones completadas no se pueden cancelar ni recuperar.',
    run_terminal: 'Esta ejecucion terminal no se puede cancelar.',
    source_context_untrusted:
      'La recuperacion no esta disponible porque no se puede verificar el contexto de ejecucion original.',
  },
};

function detectRunControlLocale(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.language || navigator.languages?.[0] || 'en';
  }

  return 'en';
}

export function resolveRunControlCopy(locale = detectRunControlLocale()): RunControlCopy {
  return locale.trim().toLowerCase().startsWith('es') ? ES_COPY : EN_COPY;
}
