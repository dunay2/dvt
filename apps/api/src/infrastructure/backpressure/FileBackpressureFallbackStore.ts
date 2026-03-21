import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { BackpressureSnapshotEnvelope, PersistedBackpressureFallbackStore } from './types.js';

type PersistedData = {
  readonly version: 1;
  readonly tenants: Record<string, Omit<BackpressureSnapshotEnvelope, 'source'>>;
};

export class FileBackpressureFallbackStore implements PersistedBackpressureFallbackStore {
  public constructor(private readonly filePath: string) {}

  public async read(tenantId: string): Promise<BackpressureSnapshotEnvelope | null> {
    const data = await this.readData();
    const stored = data?.tenants[tenantId];
    if (!stored) {
      return null;
    }

    return {
      snapshot: stored.snapshot,
      capturedAtEpochMs: stored.capturedAtEpochMs,
      source: 'fallback',
    };
  }

  public async write(tenantId: string, envelope: BackpressureSnapshotEnvelope): Promise<void> {
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true });

    const current = (await this.readData()) ?? { version: 1 as const, tenants: {} };
    current.tenants[tenantId] = {
      snapshot: envelope.snapshot,
      capturedAtEpochMs: envelope.capturedAtEpochMs,
    };

    await writeFile(this.filePath, JSON.stringify(current), 'utf8');
  }

  private async readData(): Promise<PersistedData | null> {
    try {
      const content = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content) as {
        version?: unknown;
        tenants?: Record<string, { snapshot?: unknown; capturedAtEpochMs?: unknown }>;
      };
      if (parsed.version !== 1 || !parsed.tenants || typeof parsed.tenants !== 'object') {
        return null;
      }

      const tenants: Record<string, Omit<BackpressureSnapshotEnvelope, 'source'>> = {};
      for (const [tenantId, value] of Object.entries(parsed.tenants)) {
        if (
          value &&
          typeof value === 'object' &&
          typeof value.capturedAtEpochMs === 'number' &&
          isBackpressureSnapshot(value.snapshot)
        ) {
          tenants[tenantId] = {
            snapshot: value.snapshot,
            capturedAtEpochMs: value.capturedAtEpochMs,
          };
        }
      }

      return { version: 1, tenants };
    } catch (error) {
      if (isMissingFileError(error)) {
        return null;
      }
      throw error;
    }
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as Error & { code?: unknown }).code === 'ENOENT'
  );
}

function isBackpressureSnapshot(value: unknown): value is BackpressureSnapshotEnvelope['snapshot'] {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { pendingEventsPerTenant?: unknown }).pendingEventsPerTenant === 'number' &&
    typeof (value as { outboxOldestAgeMs?: unknown }).outboxOldestAgeMs === 'number'
  );
}
