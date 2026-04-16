import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from './sessionStore';

type PersistEnvelope = {
  state: {
    tenantId: string;
    projectId: string;
    environmentId: string;
    targetAdapter: 'mock' | 'temporal';
  };
};

describe('sessionStore persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({
      tenantId: 'acme-corp',
      projectId: 'dbt-analytics',
      environmentId: 'dev',
      targetAdapter: 'mock',
    });
  });

  it('persists workspace selector values to localStorage', () => {
    useSessionStore.getState().setTenantId('globex');
    useSessionStore.getState().setProjectId('dbt-marketing');
    useSessionStore.getState().setEnvironmentId('stage');

    const persistedRaw = localStorage.getItem('dvt-web-session');
    expect(persistedRaw).not.toBeNull();

    const persisted = JSON.parse(persistedRaw as string) as PersistEnvelope;
    expect(persisted.state).toMatchObject({
      tenantId: 'globex',
      projectId: 'dbt-marketing',
      environmentId: 'stage',
      targetAdapter: 'mock',
    });
  });
});
