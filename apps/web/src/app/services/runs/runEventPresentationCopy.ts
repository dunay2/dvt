/**
 * Owned concern: resolve human-readable headline copy for known run event
 * types, falling back to the runtime-supplied event type for unknowns.
 */
import type { RunEventHeadlineKey } from './runEventPresentationModel';
import type { ApplicationLanguage } from '../../stores/applicationLanguageStore';

const RUN_EVENT_HEADLINE_COPY_EN: Record<Exclude<RunEventHeadlineKey, 'fallback'>, string> = {
  runQueued: 'Run queued',
  runStarted: 'Run started',
  runPaused: 'Run paused',
  runResumed: 'Run resumed',
  runCancelRequested: 'Cancellation requested',
  runCancelled: 'Run cancelled',
  runCompleted: 'Run completed',
  runFailed: 'Run failed',
  stepStarted: 'Step started',
  stepCompleted: 'Step completed',
  stepFailed: 'Step failed',
  stepSkipped: 'Step skipped',
};

const RUN_EVENT_HEADLINE_COPY_ES: typeof RUN_EVENT_HEADLINE_COPY_EN = {
  runQueued: 'Ejecución en cola',
  runStarted: 'Ejecución iniciada',
  runPaused: 'Ejecución pausada',
  runResumed: 'Ejecución reanudada',
  runCancelRequested: 'Cancelación solicitada',
  runCancelled: 'Ejecución cancelada',
  runCompleted: 'Ejecución completada',
  runFailed: 'Ejecución fallida',
  stepStarted: 'Paso iniciado',
  stepCompleted: 'Paso completado',
  stepFailed: 'Paso fallido',
  stepSkipped: 'Paso omitido',
};

export function resolveRunEventHeadline(
  headlineKey: RunEventHeadlineKey,
  fallbackHeadline?: string | null,
  language: ApplicationLanguage = 'en'
): string {
  if (headlineKey === 'fallback') {
    return fallbackHeadline ?? (language === 'es' ? 'Evento desconocido' : 'Unknown event');
  }

  return language === 'es'
    ? RUN_EVENT_HEADLINE_COPY_ES[headlineKey]
    : RUN_EVENT_HEADLINE_COPY_EN[headlineKey];
}
