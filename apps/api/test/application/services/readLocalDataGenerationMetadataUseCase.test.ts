import assert from 'node:assert/strict';

import {
  createLocalDataCaptureIdV1,
  createLocalDatasetIdV1,
  createLocalDataGenerationIdV1,
  createLocalDataRequestFingerprintV1,
  createLocalDataSchemaDigestV1,
  LocalDataAcquisitionRequestV1Schema,
  LocalDataGenerationManifestV1Schema,
  type LocalDataGenerationManifestV1,
} from '@dvt/contracts';
import { describe, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION_NAME,
  type IAccessDecisionService,
} from '../../../src/application/ports/accessDecision.js';
import { AuthorizeCommandScopeService } from '../../../src/application/services/authorizeCommandScopeService.js';
import { ReadLocalDataGenerationMetadataUseCase } from '../../../src/application/services/readLocalDataGenerationMetadataUseCase.js';
import type { AuthenticatedPrincipal } from '../../../src/domain/auth/types.js';

const now = new Date('2026-10-18T00:00:00.000Z');
const principal: AuthenticatedPrincipal = {
  principalId: 'reader',
  principalType: 'user',
  subjectId: 'reader',
  issuer: 'test',
  audience: 'dvt',
  expiresAt: new Date(now.getTime() + 60_000),
  rawScopes: [],
  assertedTenantIds: ['tenant'],
  assertedProjectIds: ['project'],
};
const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'environment' };
const request = LocalDataAcquisitionRequestV1Schema.parse({
  schemaVersion: 'local-data-acquisition-request.v1' as const,
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef: {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'source',
      provider: 'postgres' as const,
    },
    sourceObjectId: 'relation/database/public/source',
  },
  policy: { kind: 'full' as const },
  providerContextSha256: 'a'.repeat(64),
  schema: {
    schemaVersion: 'local-data-schema.v1' as const,
    columns: [{ ordinal: 0, name: 'id', sourceType: 'int8', localType: 'BIGINT', nullable: false }],
  },
});
const manifest = LocalDataGenerationManifestV1Schema.parse({
  schemaVersion: 'local-data-generation.v1',
  localDatasetId: createLocalDatasetIdV1(),
  generationId: createLocalDataGenerationIdV1(),
  captureId: createLocalDataCaptureIdV1(),
  request,
  requestFingerprint: createLocalDataRequestFingerprintV1(request),
  schemaSha256: createLocalDataSchemaDigestV1(request.schema),
  coverage: { kind: 'full', eofObserved: true },
  completionReason: 'source-exhausted',
  rowCount: '1',
  sourceObservation: { observedAt: now.toISOString() },
  createdAt: now.toISOString(),
});
const selection = {
  mode: 'local' as const,
  localDatasetId: manifest.localDatasetId,
  generationId: manifest.generationId,
};
const context = { principal, scope, requestId: 'metadata-read' };

describe('authorized exact LOCAL generation metadata', () => {
  const make = (): {
    state: { allowed: boolean; beforeDecision: () => void };
    reader: ReturnType<
      typeof vi.fn<
        (dataset: string, generation: string) => Promise<LocalDataGenerationManifestV1 | null>
      >
    >;
    createReader: ReturnType<typeof vi.fn>;
    useCase: ReadLocalDataGenerationMetadataUseCase;
    actions: string[];
  } => {
    const state = { allowed: true, beforeDecision: (): void => undefined };
    const actions: string[] = [];
    const decideMany: IAccessDecisionService['decideMany'] = async (_who, scopes) =>
      scopes.map((requested) => {
        state.beforeDecision();
        actions.push(requested.action.name);
        return state.allowed
          ? { ok: true as const, approvedScope: requested }
          : { ok: false as const, reason: 'ACTION_NOT_GRANTED' as const };
      });
    const authorizer = new AuthorizeCommandScopeService(
      { decideMany, decide: async (who, wanted) => (await decideMany(who, [wanted]))[0]! },
      { record: async () => undefined },
      () => now
    );
    const reader = vi
      .fn<(dataset: string, generation: string) => Promise<LocalDataGenerationManifestV1 | null>>()
      .mockResolvedValue(manifest);
    const createReader = vi.fn(() => ({ readGeneration: reader, readCapture: reader }));
    return {
      state,
      reader,
      createReader,
      actions,
      useCase: new ReadLocalDataGenerationMetadataUseCase({
        authorizer,
        createReader,
        clock: () => now,
      }),
    };
  };

  it('authorizes the explicit scope before a lookup and returns only the exact generation', async () => {
    const f = make();
    assert.deepEqual(await f.useCase.readGeneration(context, selection), manifest);
    assert.deepEqual(f.reader.mock.calls, [[manifest.localDatasetId, manifest.generationId]]);
    assert.deepEqual(f.createReader.mock.calls[0]?.[0], scope);
    assert.ok(f.actions.length >= 2);
    assert.ok(
      f.actions.every((action) => action === AUTHORIZATION_ACTION_NAME.workspaceLocalDataView)
    );
  });

  it('does not construct a storage reader or disclose absence when access is denied', async () => {
    const f = make();
    f.state.allowed = false;
    await assert.rejects(f.useCase.readGeneration(context, selection), /ACCESS_DENIED/u);
    assert.equal(f.createReader.mock.calls.length, 0);
  });

  it('rechecks authorization before publishing a result', async () => {
    const f = make();
    f.reader.mockImplementation(async () => {
      f.state.allowed = false;
      return manifest;
    });
    await assert.rejects(f.useCase.readGeneration(context, selection), /ACCESS_DENIED/u);
  });

  it('rejects a different generation instead of falling back to it', async () => {
    const f = make();
    f.reader.mockResolvedValue({ ...manifest, generationId: createLocalDataGenerationIdV1() });
    await assert.rejects(f.useCase.readGeneration(context, selection), /GENERATION_MISMATCH/u);
  });

  it('owns the validated manifest across the final asynchronous authorization check', async () => {
    const f = make();
    const borrowed = { ...globalThis.structuredClone(manifest) };
    f.reader.mockImplementation(async () => {
      f.state.beforeDecision = (): void => {
        borrowed.generationId = createLocalDataGenerationIdV1();
      };
      return borrowed;
    });
    const result = await f.useCase.readGeneration(context, selection);
    assert.deepEqual(result, manifest);
    assert.notEqual(result, borrowed);
  });

  it('distinguishes an absent authorized generation from storage failure', async () => {
    const f = make();
    f.reader.mockResolvedValue(null);
    assert.equal(await f.useCase.readGeneration(context, selection), null);
    f.reader.mockRejectedValue(new Error('/private/native/database'));
    await assert.rejects(
      f.useCase.readGeneration(context, selection),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes('READ_FAILED') &&
        !error.message.includes('/private')
    );
  });

  it('rejects LIVE and malformed selections before constructing a reader', async () => {
    const f = make();
    for (const invalid of [{ mode: 'live' }, { ...selection, generationId: 'not-a-generation' }]) {
      await assert.rejects(
        f.useCase.readGeneration(context, invalid as typeof selection),
        /INVALID_INPUT/u
      );
    }
    assert.equal(f.createReader.mock.calls.length, 0);
  });

  const captureSelection = {
    localDatasetId: manifest.localDatasetId,
    captureId: manifest.captureId,
  };

  it('resolves an exact committed capture using current view authorization', async () => {
    const f = make();
    assert.deepEqual(await f.useCase.readCapture(context, captureSelection), manifest);
    assert.deepEqual(f.reader.mock.calls, [[manifest.localDatasetId, manifest.captureId]]);
    assert.deepEqual(f.createReader.mock.calls[0]?.[0], scope);
    assert.ok(f.actions.length >= 2);
    assert.ok(
      f.actions.every((action) => action === AUTHORIZATION_ACTION_NAME.workspaceLocalDataView)
    );
  });

  it('does not disclose capture existence or construct storage when view access is denied', async () => {
    const f = make();
    f.state.allowed = false;
    await assert.rejects(f.useCase.readCapture(context, captureSelection), /ACCESS_DENIED/u);
    assert.equal(f.createReader.mock.calls.length, 0);
  });

  it('rejects a capture result if view authorization is revoked during lookup', async () => {
    const f = make();
    f.reader.mockImplementation(async () => {
      f.state.allowed = false;
      return manifest;
    });
    await assert.rejects(f.useCase.readCapture(context, captureSelection), /ACCESS_DENIED/u);
  });

  it.each([
    { ...manifest, localDatasetId: createLocalDatasetIdV1() },
    { ...manifest, captureId: createLocalDataCaptureIdV1() },
  ])('rejects a committed capture with a different identity: %j', async (other) => {
    const f = make();
    f.reader.mockResolvedValue(other);
    await assert.rejects(f.useCase.readCapture(context, captureSelection), /GENERATION_MISMATCH/u);
  });

  it('distinguishes authorized capture absence from a failed storage read', async () => {
    const f = make();
    f.reader.mockResolvedValue(null);
    assert.equal(await f.useCase.readCapture(context, captureSelection), null);
    f.reader.mockRejectedValue(new Error('/private/native/database'));
    await assert.rejects(
      f.useCase.readCapture(context, captureSelection),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes('READ_FAILED') &&
        !error.message.includes('/private')
    );
  });

  it('validates capture selectors and workspace scope before authorization or storage', async () => {
    const f = make();
    for (const invalid of [
      {},
      { ...captureSelection, captureId: manifest.generationId },
      { ...captureSelection, localDatasetId: manifest.captureId },
      { ...captureSelection, unexpected: true },
    ]) {
      await assert.rejects(
        f.useCase.readCapture(context, invalid as typeof captureSelection),
        /INVALID_INPUT/u
      );
    }
    await assert.rejects(
      f.useCase.readCapture({ ...context, scope: { ...scope, tenantId: '' } }, captureSelection),
      /INVALID_INPUT/u
    );
    assert.equal(f.actions.length, 0);
    assert.equal(f.createReader.mock.calls.length, 0);
  });

  it('owns the capture selector and manifest across the final authorization check', async () => {
    const f = make();
    const wanted = { ...captureSelection };
    const borrowed = globalThis.structuredClone(manifest);
    f.reader.mockImplementation(async () => {
      f.state.beforeDecision = (): void => {
        wanted.captureId = createLocalDataCaptureIdV1();
        borrowed.captureId = createLocalDataCaptureIdV1();
      };
      return borrowed;
    });
    assert.deepEqual(await f.useCase.readCapture(context, wanted), manifest);
    assert.notEqual(wanted.captureId, manifest.captureId);
    assert.notEqual(borrowed.captureId, manifest.captureId);
  });
});
