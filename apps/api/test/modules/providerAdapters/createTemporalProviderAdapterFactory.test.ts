import { asIsoUtcString } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createTemporalProviderAdapterFactory } from '../../../src/modules/providerAdapters/createTemporalProviderAdapterFactory.js';
import type { ProviderAdapterFactoryContext } from '../../../src/modules/providerAdapters/providerAdapterFactory.js';
import { loadEnv } from '../../../src/plugins/env.js';

const {
  closeMock,
  loadTemporalAdapterConfigMock,
  observedTemporalAdapterDepsMock,
  temporalAdapterDepsMock,
} = vi.hoisted(() => ({
  closeMock: vi.fn(async () => undefined),
  loadTemporalAdapterConfigMock: vi.fn((envInput: Record<string, unknown>) => ({
    connection: {
      address: envInput['TEMPORAL_ADDRESS'],
      namespace: envInput['TEMPORAL_NAMESPACE'] ?? 'default',
      taskQueue: envInput['TEMPORAL_TASK_QUEUE'] ?? 'dvt-temporal',
    },
    timeouts: {
      connectTimeoutMs: 1000,
      requestTimeoutMs: 1000,
    },
    workflowBudget: {
      maxStartPayloadBytes: 2_000_000,
      maxContinueAsNewPayloadBytes: Number(
        envInput['TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES'] ?? 500_000
      ),
      continueAsNewAfterLayerCount: Number(
        envInput['TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS'] ?? 100
      ),
    },
  })),
  observedTemporalAdapterDepsMock: vi.fn(),
  temporalAdapterDepsMock: vi.fn(),
}));

vi.mock('@dvt/adapter-temporal', () => ({
  TemporalAdapter: class TemporalAdapter {
    constructor(readonly deps: unknown) {
      temporalAdapterDepsMock(deps);
    }
  },
  ObservedTemporalAdapter: class ObservedTemporalAdapter {
    readonly provider = 'temporal';

    constructor(readonly deps: unknown) {
      observedTemporalAdapterDepsMock(deps);
    }
  },
  TemporalClientManager: class TemporalClientManager {
    close = closeMock;
  },
  loadTemporalAdapterConfig: loadTemporalAdapterConfigMock,
}));

describe('createTemporalProviderAdapterFactory', () => {
  it('composes the production Temporal adapter behind its observability decorator', async () => {
    const context = createContext({ TEMPORAL_ADDRESS: 'temporal.test:7233' });

    const registration = await createTemporalProviderAdapterFactory().build(context);

    expect(registration).not.toBeNull();
    expect(observedTemporalAdapterDepsMock).toHaveBeenCalledWith({
      adapter: expect.anything(),
      config: expect.objectContaining({
        connection: expect.objectContaining({ address: 'temporal.test:7233' }),
      }),
      observability: context.observability,
    });
  });

  it('passes the continue-as-new payload budget env into Temporal adapter config', async () => {
    const factory = createTemporalProviderAdapterFactory();
    const registration = await factory.build(
      createContext({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: '64000',
      })
    );

    expect(registration).not.toBeNull();
    expect(loadTemporalAdapterConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: '64000',
      })
    );
    expect(temporalAdapterDepsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          workflowBudget: expect.objectContaining({
            maxContinueAsNewPayloadBytes: 64000,
          }),
        }),
      })
    );
  });

  it('passes step activity routes into Temporal adapter config', async () => {
    const factory = createTemporalProviderAdapterFactory();
    const routes = JSON.stringify({
      PYTHON_SCRIPT: {
        capability: 'executor.python',
        taskQueue: 'dvt-temporal-python',
      },
    });

    const registration = await factory.build(
      createContext({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        TEMPORAL_STEP_ACTIVITY_ROUTES: routes,
      })
    );

    expect(registration).not.toBeNull();
    expect(loadTemporalAdapterConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        TEMPORAL_STEP_ACTIVITY_ROUTES: routes,
      })
    );
  });

  it('declares DBT executor capability only when the API runtime profile enables DBT', async () => {
    const factory = createTemporalProviderAdapterFactory();

    await factory.build(
      createContext({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
      })
    );

    expect(temporalAdapterDepsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCapabilities: [],
      })
    );

    await factory.build(
      createContext({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        DVT_TEMPORAL_DBT_ENABLED: 'true',
      })
    );

    expect(temporalAdapterDepsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCapabilities: ['executor.dbt'],
      })
    );
  });

  it('declares object-file PostgreSQL capability only when its worker profile is enabled', async () => {
    const factory = createTemporalProviderAdapterFactory();

    await factory.build(
      createContext({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: 'true',
      })
    );

    expect(temporalAdapterDepsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCapabilities: ['executor.object-file-postgres-load'],
      })
    );
  });

  it('declares HTTP JSON acquisition capability only when its worker profile is enabled', async () => {
    const factory = createTemporalProviderAdapterFactory();

    await factory.build(
      createContext({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        DVT_TEMPORAL_HTTP_JSON_ENABLED: 'true',
      })
    );

    expect(temporalAdapterDepsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCapabilities: ['executor.http-json-acquisition'],
      })
    );
  });

  it('declares Python code capability only when its worker profile is enabled', async () => {
    const factory = createTemporalProviderAdapterFactory();

    await factory.build(
      createContext({
        TEMPORAL_ADDRESS: 'temporal.test:7233',
        DVT_TEMPORAL_PYTHON_ENABLED: 'true',
      })
    );

    expect(temporalAdapterDepsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCapabilities: ['executor.python-code'],
      })
    );
  });
});

function createContext(envOverrides: Record<string, string>): ProviderAdapterFactoryContext {
  const env = Object.assign(loadEnv(envOverrides), envOverrides);

  return {
    env,
    stateStore: {
      getRunMetadataByRunId: vi.fn(),
      listEvents: vi.fn(),
    },
    stateStoreWrite: {
      appendAndEnqueueTx: vi.fn(),
    },
    clock: {
      nowIsoUtc: () => asIsoUtcString('2026-04-27T00:00:00.000Z'),
    },
    projector: {
      rebuild: vi.fn(),
    },
    observability: {} as ProviderAdapterFactoryContext['observability'],
  };
}
