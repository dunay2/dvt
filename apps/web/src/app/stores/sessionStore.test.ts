// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { useSessionStore } from './sessionStore';

type PersistEnvelope = {
  state: Partial<{
    tenantId: string;
    projectId: string;
    environmentId: string;
    targetAdapter: string;
    availableTargetAdapters: readonly string[];
  }>;
};

const bootstrapState = {
  tenantId: useSessionStore.getState().tenantId,
  projectId: useSessionStore.getState().projectId,
  environmentId: useSessionStore.getState().environmentId,
  targetAdapter: useSessionStore.getState().targetAdapter,
  availableTargetAdapters: useSessionStore.getState().availableTargetAdapters,
  availableWorkspaces: useSessionStore.getState().availableWorkspaces,
  workspaceScopeSelectionStatus: useSessionStore.getState().workspaceScopeSelectionStatus,
  workspaceScopeSelectionRejectionReason:
    useSessionStore.getState().workspaceScopeSelectionRejectionReason,
  rejectedWorkspaceScope: useSessionStore.getState().rejectedWorkspaceScope,
};

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();

const stalePersistedTargetAdapter = 'retired-provider';

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
    useSessionStore.getState().setTargetAdapter(bootstrapState.targetAdapter);

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

  it('rehydrates a dynamic project selection for later server grant validation', async () => {
    const dynamicProjectId = 'project-created-from-active-workspace';
    expect(workspaceBootstrap.projectOptions).not.toContainEqual({
      value: dynamicProjectId,
    });

    localStorage.setItem(
      'dvt-web-session',
      JSON.stringify({
        state: {
          tenantId: bootstrapState.tenantId,
          projectId: dynamicProjectId,
          environmentId: bootstrapState.environmentId,
        },
      } satisfies PersistEnvelope)
    );

    await useSessionStore.persist.rehydrate();

    expect(useSessionStore.getState()).toMatchObject({
      tenantId: bootstrapState.tenantId,
      projectId: dynamicProjectId,
      environmentId: bootstrapState.environmentId,
    });
  });

  it('keeps the runtime-owned target adapter catalog during rehydrate', async () => {
    localStorage.setItem(
      'dvt-web-session',
      JSON.stringify({
        state: {
          ...validPersistedScope,
          targetAdapter: stalePersistedTargetAdapter,
          availableTargetAdapters: [stalePersistedTargetAdapter],
        },
      } satisfies PersistEnvelope)
    );

    await useSessionStore.persist.rehydrate();

    expect(useSessionStore.getState().targetAdapter).toBe(bootstrapState.targetAdapter);
    expect(useSessionStore.getState().availableTargetAdapters).toEqual(
      bootstrapState.availableTargetAdapters
    );
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
