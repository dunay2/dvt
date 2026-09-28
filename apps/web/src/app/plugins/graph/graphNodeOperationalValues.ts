/** Owned concern: graphNodeOperationalValues. */
import { formatCompactNumber } from '../../components/canvas/formatCompactNumber';

import type { GraphNodeCardStatusTone } from './graphNodeCardStrategyContracts';
import type { GraphNodeSizeEvidenceProjection } from './graphNodeSourceMetricProjection';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';
import { formatBytes, numericValue, stringValue } from './graphNodeCardStrategyUtils';

export type GraphNodeCardCopy = ReturnType<typeof resolveGraphNodeCardCopy>;

export function firstNumericValue(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  keys: readonly string[]
): number | null {
  for (const key of keys) {
    const value = numericValue(metadata[key]) ?? numericValue(data[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

export function formatMinutes(value: number): string {
  return `${formatCompactNumber(value)} min`;
}

export function formatCadenceMinutes(value: number, copy: GraphNodeCardCopy): string {
  return copy.cadenceValueTemplate.replace('{minutes}', formatCompactNumber(value));
}

export function formatThroughputBytesPerMinute(value: number, locale?: string): string {
  return `${formatBytes(value, locale)}/min`;
}

export function firstRuntimeNumericValue(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  runtimeData: Record<string, unknown>,
  keys: readonly string[]
): number | null {
  for (const key of keys) {
    const value =
      numericValue(metadata[key]) ?? numericValue(data[key]) ?? numericValue(runtimeData[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

export function firstRuntimeStringValue(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  runtimeData: Record<string, unknown>,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value =
      stringValue(metadata[key]) ?? stringValue(data[key]) ?? stringValue(runtimeData[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

type SchemaDriftProjection = Readonly<{
  label: string;
  tone: GraphNodeCardStatusTone;
}>;

export function sizeEvidenceTone(
  sizeEvidence: GraphNodeSizeEvidenceProjection
): GraphNodeCardStatusTone {
  return sizeEvidence.provenance === 'measured' ? 'success' : 'warning';
}

export function resolveSchemaDriftProjection(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  copy: GraphNodeCardCopy
): SchemaDriftProjection | null {
  const driftStatus =
    stringValue(metadata.schemaDriftStatus) ??
    stringValue(data.schemaDriftStatus) ??
    stringValue(metadata.schemaDrift) ??
    stringValue(data.schemaDrift);
  if (!driftStatus) {
    return null;
  }

  switch (driftStatus.toLowerCase()) {
    case 'ok':
    case 'clean':
    case 'none':
    case 'no-drift':
    case 'no_drift':
      return { label: copy.noDriftDetectedLabel, tone: 'success' };
    case 'detected':
    case 'drift':
    case 'drifted':
    case 'warning':
    case 'warn':
      return { label: copy.driftDetectedLabel, tone: 'warning' };
    default:
      return { label: driftStatus, tone: 'neutral' };
  }
}
