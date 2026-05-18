/**
 * Owned concern: format shared run event presentation semantics as one
 * terminal-style console log line.
 */
import {
  buildRunEventPresentationModel,
  levelForEventType,
} from '../../services/runs/runEventPresentationModel';
import { resolveRunEventHeadline } from '../../services/runs/runEventPresentationCopy';
import type { RunEvent } from '../../types/engine';

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString('en-GB', { hour12: false });
  } catch {
    return '??:??:??';
  }
}

export function formatRunEventAsLogLine(event: RunEvent): string {
  const time = formatTimestamp(event.emittedAt);
  const presentation = buildRunEventPresentationModel(event);
  const headline = resolveRunEventHeadline(presentation.headlineKey, presentation.fallbackHeadline);
  const baseMessage = presentation.stepId ? `${headline} (${presentation.stepId})` : headline;
  const message = presentation.detail ? `${baseMessage}: ${presentation.detail}` : baseMessage;
  return `${time}  [${presentation.level}]  ${message}`;
}

export { levelForEventType };
