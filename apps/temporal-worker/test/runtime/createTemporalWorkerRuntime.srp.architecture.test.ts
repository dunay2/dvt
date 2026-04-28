/**
 * Owned concern: keep createTemporalWorkerRuntime as a thin runtime assembly
 * boundary, not a concrete infrastructure builder.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const RUNTIME_ROOT = join(import.meta.dirname, '../../src/runtime');

describe('createTemporalWorkerRuntime SRP boundary', () => {
  it('delegates concrete infrastructure construction to focused runtime modules', () => {
    const source = readRuntimeSource('createTemporalWorkerRuntime.ts');

    for (const forbiddenToken of [
      'PostgresPlanStore',
      'PostgresStateStoreAdapter',
      'PostgresRunStateCommandPortBridge',
      'ArtifactBackedRunExecutionContextReader',
      'ArtifactBackedDbtProjectBundleReader',
      'DbtCliPluginRunner',
      'createDbtStepActivityRegistry',
      'NativeConnection',
      'CircuitBreakingRunStateCommandPort',
      'PlanIntegrityValidator',
      'IdempotencyKeyBuilder',
    ]) {
      expect(source).not.toContain(forbiddenToken);
    }
  });

  it('keeps the runtime entrypoint focused on assembling focused modules', () => {
    const source = readRuntimeSource('createTemporalWorkerRuntime.ts');

    expect(source).toContain('createTemporalWorkerRuntimeResources');
    expect(source).toContain('createTemporalWorkerHost');
    expect(source).toContain('createTemporalWorkerRuntimeHandle');
    expect(nonBlankLineCount(source)).toBeLessThanOrEqual(40);
  });

  it('documents focused ownership for extracted runtime modules', () => {
    const expectedOwnedConcerns = new Map<string, string>([
      [
        'temporalWorkerRuntimeResources.ts',
        '@ownedConcern Compose validated worker runtime resources from environment and options.',
      ],
      [
        'temporalWorkerStores.ts',
        '@ownedConcern Build state, plan, and activity dependencies for the Temporal worker runtime.',
      ],
      [
        'temporalWorkerDbtProfile.ts',
        '@ownedConcern Build the optional DBT worker profile and step activity registry.',
      ],
      [
        'temporalWorkerHost.ts',
        '@ownedConcern Build Temporal worker host configuration and host instance.',
      ],
      [
        'temporalWorkerRuntimeHandle.ts',
        '@ownedConcern Own runtime handle idempotency and delegate lifecycle operations.',
      ],
      [
        'temporalWorkerLifecycle.ts',
        '@ownedConcern Execute Temporal worker startup, shutdown, connection, and abort lifecycle.',
      ],
    ]);

    for (const [fileName, expectedOwnedConcern] of expectedOwnedConcerns.entries()) {
      expect(readRuntimeSource(fileName)).toContain(expectedOwnedConcern);
    }
  });
});

function readRuntimeSource(fileName: string): string {
  return readFileSync(join(RUNTIME_ROOT, fileName), 'utf8');
}

function nonBlankLineCount(source: string): number {
  return source.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}
