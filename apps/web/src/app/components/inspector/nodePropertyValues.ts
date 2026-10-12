/** Owned concern: nodePropertyValues. */

import type { NodePropertyRow, NodePropertyRowId } from './nodePropertiesContracts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate): readonly string[] => {
    const text = readString(candidate);
    return text == null ? [] : [text];
  });
}

export function readFirstString(...values: readonly unknown[]): string | undefined {
  for (const value of values) {
    const text = readString(value);
    if (text != null) {
      return text;
    }
  }

  return undefined;
}

export function formatWords(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim();
  return words.length > 0 ? words.charAt(0).toUpperCase() + words.slice(1) : value;
}

export function addRow(
  rows: NodePropertyRow[],
  id: NodePropertyRowId,
  label: string,
  value: string | undefined | null
): void {
  if (value != null && value.trim().length > 0) {
    rows.push({ id, label, value });
  }
}
