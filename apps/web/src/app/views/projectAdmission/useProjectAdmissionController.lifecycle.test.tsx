// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import type {
  CreateProjectResponse,
  ProjectOnboardingService,
} from '../../services/projectOnboarding/projectOnboardingService';
import { SessionContextDiscardedError } from '../../services/session/sessionContextPublication';
import {
  useProjectAdmissionController,
  type ProjectAdmissionCallbacks,
} from './useProjectAdmissionController';

const CREATED_PROJECT: CreateProjectResponse = {
  project: {
    tenantId: 'tenant-1',
    projectId: 'orders',
    name: 'Orders',
    environmentIds: ['dev'],
  },
  defaultWorkspace: {
    tenantId: 'tenant-1',
    projectId: 'orders',
    projectName: 'Orders',
    environmentId: 'dev',
  },
};

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function serviceWithCreation(
  createProject: ProjectOnboardingService['createProject']
): ProjectOnboardingService {
  return {
    listProjects: async () => ({
      tenants: [{ tenantId: 'tenant-1', canCreateProject: true }],
      projects: [CREATED_PROJECT.project],
      integrityFindings: [],
    }),
    createProject,
  };
}

type ProbeProps = ProjectAdmissionCallbacks & {
  active?: boolean;
  service: ProjectOnboardingService;
};

function AdmissionProbe(props: ProbeProps): JSX.Element {
  const controller = useProjectAdmissionController(props);
  return (
    <form onSubmit={(event) => void controller.createProject(event)}>
      <input
        aria-label="Project name"
        value={controller.projectName}
        onChange={(event) => controller.setProjectName(event.target.value)}
      />
      <button type="submit" disabled={!controller.canSubmit}>
        Create
      </button>
      <button type="button" onClick={() => void controller.selectProject(CREATED_PROJECT.project)}>
        Select
      </button>
      <output>{controller.formError ?? controller.submissionState}</output>
    </form>
  );
}

describe('project admission activation lifetime', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
  afterEach(async () => {
    await mounted?.cleanup();
  });

  async function submit(): Promise<void> {
    await act(async () => {
      fireEvent.input(mounted!.container.querySelector('input')!, { target: { value: 'Orders' } });
    });
    await act(async () => {
      fireEvent.submit(mounted!.container.querySelector('form')!);
    });
  }

  it('does not activate a server-created project after its view unmounts', async () => {
    const creation = deferred<CreateProjectResponse>();
    const onProjectCreated = vi.fn<ProbeProps['onProjectCreated']>();
    mounted = await withTestQueryClient(
      <AdmissionProbe
        service={serviceWithCreation(() => creation.promise)}
        onProjectCreated={onProjectCreated}
      />
    );
    await submit();
    await mounted.cleanup();
    await act(async () => {
      creation.resolve(CREATED_PROJECT);
    });
    expect(onProjectCreated).not.toHaveBeenCalled();
  });

  it('aborts in-flight activation when the dialog becomes inactive', async () => {
    const activation = deferred<void>();
    const onProjectCreated = vi.fn<ProbeProps['onProjectCreated']>(() => activation.promise);
    const service = serviceWithCreation(async () => CREATED_PROJECT);
    mounted = await withTestQueryClient(
      <AdmissionProbe service={service} onProjectCreated={onProjectCreated} />
    );
    await submit();
    const signal = onProjectCreated.mock.calls[0]?.[1];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
    await mounted.render(
      <AdmissionProbe active={false} service={service} onProjectCreated={onProjectCreated} />
    );
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      activation.resolve();
    });
    expect(mounted.container.querySelector('output')?.textContent).not.toContain('could not');
  });

  it('does not revive a closed creation when the dialog opens again', async () => {
    const creation = deferred<CreateProjectResponse>();
    const createProject = vi
      .fn<ProjectOnboardingService['createProject']>()
      .mockReturnValueOnce(creation.promise)
      .mockResolvedValue(CREATED_PROJECT);
    const onProjectCreated = vi.fn<ProbeProps['onProjectCreated']>();
    const service = serviceWithCreation(createProject);
    mounted = await withTestQueryClient(
      <AdmissionProbe service={service} onProjectCreated={onProjectCreated} />
    );
    await submit();
    await mounted.render(
      <AdmissionProbe active={false} service={service} onProjectCreated={onProjectCreated} />
    );
    await mounted.render(
      <AdmissionProbe active service={service} onProjectCreated={onProjectCreated} />
    );
    await act(async () => {
      creation.resolve(CREATED_PROJECT);
    });
    expect(onProjectCreated).not.toHaveBeenCalled();
    await submit();
    expect(createProject).toHaveBeenCalledTimes(2);
    expect(onProjectCreated).toHaveBeenCalledTimes(1);
  });

  it('retains a live activation lifetime after StrictMode effect replay', async () => {
    const onProjectCreated = vi.fn<ProbeProps['onProjectCreated']>();
    mounted = await withTestQueryClient(
      <StrictMode>
        <AdmissionProbe
          service={serviceWithCreation(async () => CREATED_PROJECT)}
          onProjectCreated={onProjectCreated}
        />
      </StrictMode>
    );
    await submit();
    expect(onProjectCreated).toHaveBeenCalledTimes(1);
    expect(onProjectCreated.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
    expect(onProjectCreated.mock.calls[0]?.[1].aborted).toBe(false);
  });

  it('invalidates an existing-project selection when its view unmounts', async () => {
    const activation = deferred<void>();
    const onProjectSelected = vi.fn<NonNullable<ProjectAdmissionCallbacks['onProjectSelected']>>(
      () => activation.promise
    );
    mounted = await withTestQueryClient(
      <AdmissionProbe
        service={serviceWithCreation(async () => CREATED_PROJECT)}
        onProjectCreated={vi.fn()}
        onProjectSelected={onProjectSelected}
      />
    );
    await act(async () => {
      fireEvent.click(mounted!.container.querySelector('button[type="button"]')!);
    });
    const signal = onProjectSelected.mock.calls[0]?.[1];
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
    await mounted.cleanup();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      activation.resolve();
    });
  });

  it('does not present superseded activation as failed server creation', async () => {
    const onProjectCreated = vi
      .fn<ProbeProps['onProjectCreated']>()
      .mockRejectedValue(new SessionContextDiscardedError('superseded'));
    mounted = await withTestQueryClient(
      <AdmissionProbe
        service={serviceWithCreation(async () => CREATED_PROJECT)}
        onProjectCreated={onProjectCreated}
      />
    );
    await submit();
    expect(mounted.container.querySelector('output')?.textContent).toBe('created');
    expect(mounted.container.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(
      true
    );
  });
});
