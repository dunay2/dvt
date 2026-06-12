/** Owned concern: share pure graph card projection helpers across plugin strategies. */
import type { CanonicalNode } from '../../types/canonical';
import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function metadataOf(node: CanonicalNode): Record<string, unknown> {
  return isRecord(node.metadata) ? node.metadata : {};
}

export function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function numericValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function arrayCount(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

export function formatBytes(value: number): string {
  if (Math.abs(value) >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '')} GB`;
  }
  if (Math.abs(value) >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  }
  if (Math.abs(value) >= 1024) {
    return `${(value / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  }
  return `${value} B`;
}

export function pushMetric(
  metrics: GraphNodeCardMetric[],
  id: string,
  label: string,
  value: string | number | null
): void {
  if (value === null) {
    return;
  }
  metrics.push({ id, label, value: String(value) });
}

export function resolveColumnCount(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>
): number {
  return arrayCount(data.columns) ?? arrayCount(metadata.columns) ?? 0;
}
