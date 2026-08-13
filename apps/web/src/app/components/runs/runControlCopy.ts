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
    dispatch_pending: 'Cancellation is available after runtime dispatch completes.',
    run_active: 'Recovery is available only after a run fails or is cancelled.',
    run_cancelled: 'The run is already cancelled.',
    run_completed: 'Completed runs cannot be cancelled or recovered.',
    run_terminal: 'This terminal run cannot be cancelled.',
    recovery_evidence_unknown: 'Open the run to verify whether recovery is available.',
    source_adapter_unavailable:
      'Recovery is unavailable because the original runtime adapter is not configured.',
    source_plan_unavailable:
      'Recovery is unavailable because the original execution plan is no longer available.',
    source_context_untrusted:
      'Recovery is unavailable because the original execution context cannot be verified.',
  },
};

const ES_COPY: RunControlCopy = {
  cancel: 'Cancelar ejecución',
  recover: 'Recuperar ejecución',
  cancellationRequested: 'Cancelación solicitada.',
  cancellationAlreadyRequested: 'La cancelación ya estaba solicitada.',
  cancellationAlreadyCompleted: 'La ejecución ya está cancelada.',
  recoveryStarted: (runId) => `Recuperación iniciada como ${runId}.`,
  failure: (message) => `El comando de ejecución ha fallado: ${message}`,
  unavailableReason: {
    cancellation_pending: 'La cancelación ya está pendiente.',
    dispatch_pending: 'La cancelación estará disponible al finalizar el envío al runtime.',
    run_active: 'La recuperación solo está disponible tras un fallo o cancelación.',
    run_cancelled: 'La ejecución ya está cancelada.',
    run_completed: 'Las ejecuciones completadas no se pueden cancelar ni recuperar.',
    run_terminal: 'Esta ejecución terminal no se puede cancelar.',
    recovery_evidence_unknown:
      'Abre la ejecución para comprobar si la recuperación está disponible.',
    source_adapter_unavailable:
      'La recuperación no está disponible porque el adaptador de ejecución original no está configurado.',
    source_plan_unavailable:
      'La recuperación no está disponible porque el plan de ejecución original ya no está disponible.',
    source_context_untrusted:
      'La recuperación no está disponible porque no se puede verificar el contexto de ejecución original.',
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
