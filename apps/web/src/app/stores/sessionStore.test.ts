import { beforeEach, describe, expect, it } from 'vitest';

import { getRuntimeDataSourceMode } from '../services/config/runtimeDataSourceMode';
import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { useSessionStore } from './sessionStore';

type PersistEnvelope = {
  state: Partial<{
    tenantId: string;
    projectId: string;
    environmentId: string;
    targetAdapter: 'temporal' | 'conductor';
  }>;
};

const bootstrapState = {
  tenantId: useSessionStore.getState().tenantId,
  projectId: useSessionStore.getState().projectId,
  environmentId: useSessionStore.getState().environmentId,
  targetAdapter: useSessionStore.getState().targetAdapter,
};

const workspaceBootstrap = resolveWorkspaceBootstrapConfig(getRuntimeDataSourceMode());

const alternateTargetAdapter = bootstrapState.targetAdapter === 'temporal' ? 'conductor' : 'temporal';

function pickValidPersistedScopeValue(
  options: Array<{ value: string }>,
  currentValue: string
): string {
  return options.find((option) => option.value !== currentValue)?.value ?? currentValue;
}

const validPersistedScope = {
  tenantId: pickValidPersistedScopeValue(workspaceBootstrap.tenantOptions, bootstrapState.tenantId),
  projectId: pickValidPersistedScopeValue(
    workspaceBootstrap.projectOptions,
    bootstrapState.projectId
  ),
  environmentId: pickValidPersistedScopeValue(
    workspaceBootstrap.environmentOptions,
    bootstrapState.environmentId
  ),
};

describe('sessionStore persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState(bootstrapState);
  });

  it('persists only shell workspace selector values to localStorage', () => {
    useSessionStore.getState().setTenantId('globex');
    useSessionStore.getState().setProjectId('dbt-marketing');
    useSessionStore.getState().setEnvironmentId('stage');
    useSessionStore.getState().setTargetAdapter(alternateTargetAdapter);

    const persistedRaw = localStorage.getItem('dvt-web-session');
    expect(persistedRaw).not.toBeNull();

    const persisted = JSON.parse(persistedRaw as string) as PersistEnvelope;
    expect(persisted.state).toEqual({
      tenantId: 'globex',
      projectId: 'dbt-marketing',
      environmentId: 'stage',
    });
  });

  it('rehydrates valid persisted workspace selectors', async () => {
    localStorage.setItem(
      'dvt-web-session',
      JSON.stringify({
        state: validPersistedScope,
      } satisfies PersistEnvelope)
    );

    await useSessionStore.persist.rehydrate();

    expect(useSessionStore.getState()).toMatchObject({
      ...validPersistedScope,
      targetAdapter: bootstrapState.targetAdapter,
    });
  });

  it('keeps the runtime-owned target adapter during rehydrate', async () => {
    localStorage.setItem(
      'dvt-web-session',
      JSON.stringify({
        state: {
          ...validPersistedScope,
          targetAdapter: alternateTargetAdapter,
        },
      } satisfies PersistEnvelope)
    );

    await useSessionStore.persist.rehydrate();

    expect(useSessionStore.getState().targetAdapter).toBe(bootstrapState.targetAdapter);
  });

  it('falls back to bootstrap scope when persisted selectors are no longer valid', async () => {
    localStorage.setItem(
      'dvt-web-session',
      JSON.stringify({
        state: {
          tenantId: 'retired-tenant',
          projectId: 'retired-project',
          environmentId: 'retired-env',
        },
      } satisfies PersistEnvelope)
    );

    await useSessionStore.persist.rehydrate();

    expect(useSessionStore.getState()).toMatchObject(bootstrapState);
  });
});
