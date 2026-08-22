import { afterEach, describe, expect, it, vi } from 'vitest';

import { generatePlatformRunId } from '../../../src/entrypoints/http/startRunIdentity.js';
import { parseStartRunBody } from '../../../src/entrypoints/http/startRunRouteParser.js';

const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/p.json',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0.0',
  planId: 'p1',
  planVersion: '1.0',
};

const START_RUN_ADAPTER_REGISTRY = {
  isSupported(value: string): value is 'temporal' {
    return value === 'temporal';
  },
  listSupported(): ReadonlyArray<'temporal'> {
    return ['temporal'];
  },
};

const VALID_START_RUN_BODY = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
  selection: {
    mode: 'explicit',
    nodeIds: ['model.orders'],
  },
  targetAdapter: 'temporal',
  planRef: VALID_PLAN_REF,
};

describe('start-run platform identity', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects caller-owned identity before allocating a platform identity', () => {
    let generatorCalled = false;

    const parsed = parseStartRunBody(
      { ...VALID_START_RUN_BODY, runId: 'client-authored-run' },
      START_RUN_ADAPTER_REGISTRY,
      () => {
        generatorCalled = true;
        return 'run_should_not_be_used';
      }
    );

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'client_run_id_not_allowed',
        target: 'runId',
      },
    });
    expect(generatorCalled).toBe(false);
  });

  it('allocates a UUIDv7 identity after valid caller input', () => {
    const before = Date.now();
    const runId = generatePlatformRunId();
    const after = Date.now();
    const uuid = runId.replace(/^run_/u, '');
    const timestampMs = Number.parseInt(uuid.replaceAll('-', '').slice(0, 12), 16);

    expect(runId).toMatch(
      /^run_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
    );
    expect(timestampMs).toBeGreaterThanOrEqual(before);
    expect(timestampMs).toBeLessThanOrEqual(after);
  });

  it('fails closed when the shared crypto authority has no secure entropy', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => generatePlatformRunId()).toThrow('CRYPTO_SECURE_RANDOM_UNAVAILABLE');
  });
});
