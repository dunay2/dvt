/**
 * Owned concern: transform a raw RunEvent into a presentation-oriented model
 * with semantic level, headline key, and optional step context.
 */
import type { RunEvent } from '../../types/engine';

export type RunEventLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export type RunEventHeadlineKey =
  | 'runQueued'
  | 'runStarted'
  | 'runPaused'
  | 'runResumed'
  | 'runCancelRequested'
  | 'runCancelled'
  | 'runCompleted'
  | 'runFailed'
  | 'stepStarted'
  | 'stepCompleted'
  | 'stepFailed'
  | 'stepSkipped'
  | 'fallback';

export type RunEventPresentationModel = {
  readonly level: RunEventLevel;
  readonly headlineKey: RunEventHeadlineKey;
  readonly fallbackHeadline: string | null;
  readonly detail: string | null;
  readonly stepId: string | null;
};

const EVENT_LEVEL: Record<string, RunEventLevel> = {
  RunQueued: 'INFO',
  RunStarted: 'INFO',
  RunPaused: 'WARN',
  RunResumed: 'INFO',
  RunCancelRequested: 'WARN',
  RunCancelled: 'WARN',
  RunCompleted: 'SUCCESS',
  RunFailed: 'ERROR',
  StepStarted: 'INFO',
  StepCompleted: 'SUCCESS',
  StepFailed: 'ERROR',
  StepSkipped: 'WARN',
};

function readPayloadMessage(event: RunEvent): string | null {
  const payload = event.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const message = (payload as Record<string, unknown>).message;
  return typeof message === 'string' && message.length > 0 ? message : null;
}

function headlineKeyForEventType(eventType: string): RunEventHeadlineKey {
  switch (eventType) {
    case 'RunQueued':
      return 'runQueued';
    case 'RunStarted':
      return 'runStarted';
    case 'RunPaused':
      return 'runPaused';
    case 'RunResumed':
      return 'runResumed';
    case 'RunCancelRequested':
      return 'runCancelRequested';
    case 'RunCancelled':
      return 'runCancelled';
    case 'RunCompleted':
      return 'runCompleted';
    case 'RunFailed':
      return 'runFailed';
    case 'StepStarted':
      return 'stepStarted';
    case 'StepCompleted':
      return 'stepCompleted';
    case 'StepFailed':
      return 'stepFailed';
    case 'StepSkipped':
      return 'stepSkipped';
    default:
      return 'fallback';
  }
}

export function levelForEventType(eventType: string): RunEventLevel {
  return EVENT_LEVEL[eventType] ?? 'INFO';
}

export function buildRunEventPresentationModel(event: RunEvent): RunEventPresentationModel {
  const headlineKey = headlineKeyForEventType(event.eventType);

  return {
    level: levelForEventType(event.eventType),
    headlineKey,
    fallbackHeadline: headlineKey === 'fallback' ? event.eventType : null,
    detail: readPayloadMessage(event),
    stepId: event.stepId ?? null,
  };
}
