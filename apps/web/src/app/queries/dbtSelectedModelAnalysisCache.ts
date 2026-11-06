/** Durable backing for ready evidence in the existing scoped selected-model query. */
import { DbtSelectedModelAnalysisSchema, type DbtSelectedModelAnalysis } from '@dvt/contracts';

import type { queryKeys } from './queryKeys';

type AnalysisKey = ReturnType<typeof queryKeys.workspace.dbtSelectedModelAnalysis>;
type Entry = Readonly<{ key: string; data: DbtSelectedModelAnalysis }>;

const STORAGE_KEY = 'dvt:dbt-selected-model-analysis:v1';
const MAX_ENTRIES = 8;
const MAX_BYTES = 4 * 1024 * 1024;

function acceptedAnalysis(
  key: readonly unknown[],
  value: unknown
): DbtSelectedModelAnalysis | undefined {
  if (
    key.length !== 9 ||
    key[0] !== 'workspace' ||
    key[1] !== 'dbt-selected-model-analysis' ||
    key.slice(2).some((part) => typeof part !== 'string' || !part.trim())
  )
    return undefined;
  const parsed = DbtSelectedModelAnalysisSchema.safeParse(value);
  if (!parsed.success || parsed.data.status !== 'ready') return undefined;
  const data = parsed.data;
  const authority = data.authorityBinding.authority;
  return authority.kind === 'dbt-project-files' &&
    data.authorityBinding.canvasId === key[5] &&
    authority.projectRoot === key[6] &&
    data.projectRevision.projectRoot === key[6] &&
    data.selectedUniqueId === key[7] &&
    `${data.analysisSha256}:${data.projectRevision.contentSetSha256}` === key[8]
    ? data
    : undefined;
}

function readEntries(): Entry[] {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw.length * 2 > MAX_BYTES) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES).flatMap(readEntry) : [];
  } catch {
    return [];
  }
}

function readEntry(entry: unknown): Entry[] {
  try {
    if (entry === null || typeof entry !== 'object' || !('key' in entry) || !('data' in entry))
      return [];
    if (typeof entry.key !== 'string') return [];
    const key: unknown = JSON.parse(entry.key);
    if (!Array.isArray(key)) return [];
    const data = acceptedAnalysis(key, entry.data);
    return data === undefined ? [] : [{ key: entry.key, data }];
  } catch {
    return [];
  }
}

export function restoreDbtSelectedModelAnalysis(
  key: AnalysisKey
): DbtSelectedModelAnalysis | undefined {
  try {
    const entry = readEntries().find((candidate) => candidate.key === JSON.stringify(key));
    return entry === undefined ? undefined : acceptedAnalysis(key, entry.data);
  } catch {
    return undefined;
  }
}

export function persistDbtSelectedModelAnalysis(key: AnalysisKey, value: unknown): void {
  const data = acceptedAnalysis(key, value);
  if (data === undefined) return;
  try {
    const identity = JSON.stringify(key);
    if (JSON.stringify([{ key: identity, data }]).length * 2 > MAX_BYTES) return;
    const entries = readEntries().filter((entry) => entry.key !== identity);
    entries.push({ key: identity, data });
    while (entries.length > MAX_ENTRIES || JSON.stringify(entries).length * 2 > MAX_BYTES) {
      entries.shift();
    }
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage denial or exhaustion must not discard the live query result.
  }
}
