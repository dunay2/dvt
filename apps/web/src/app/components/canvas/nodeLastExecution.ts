/** Read recorded execution facts without importing card or Inspector presentation. */
export type NodeLastExecution =
  Readonly<{ kind: 'age'; minutes: number }> | Readonly<{ kind: 'timestamp'; at: string }>;

export function readNodeLastExecution(
  ...records: readonly Readonly<Record<string, unknown>>[]
): NodeLastExecution | null {
  for (const key of ['lastRunMinutesAgo', 'lastRunAgeMinutes']) {
    for (const record of records) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value))
        return { kind: 'age', minutes: value };
    }
  }
  for (const record of records) {
    const value = record.lastRunAt;
    if (typeof value === 'string' && value.trim()) return { kind: 'timestamp', at: value.trim() };
  }
  return null;
}
