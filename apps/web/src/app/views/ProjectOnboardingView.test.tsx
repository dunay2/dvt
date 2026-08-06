// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import type { ProjectOnboardingService } from '../services/projectOnboarding/projectOnboardingService';
import ProjectOnboardingView from './ProjectOnboardingView';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';

function buildProjectOnboardingService(
  overrides: Partial<ProjectOnboardingService> = {}
): ProjectOnboardingService {
  return {
    listProjects: async () => ({
      tenants: [{ tenantId: 'tenant-1', displayName: 'Tenant 1', canCreateProject: true }],
      projects: [],
    }),
    createProject: async () => ({
      project: {
        tenantId: 'tenant-1',
        projectId: 'orders',
        name: 'Orders',
        environmentIds: ['dev'],
      },
      effectiveWorkspace: {
        tenantId: 'tenant-1',
        projectId: 'orders',
        environmentId: 'dev',
      },
    }),
    ...overrides,
  };
}

describe('ProjectOnboardingView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  it('lets a first-use authenticated user create the first project', async () => {
    const createProject = vi.fn(buildProjectOnboardingService().createProject);
    const onProjectCreated = vi.fn();

    mounted = await withTestQueryClient(
      <ProjectOnboardingView
        onProjectCreated={onProjectCreated}
        service={buildProjectOnboardingService({ createProject })}
      />
    );

    await waitForReactQuery(
      () => mounted?.container.querySelector('[data-slot="project-onboarding-form"]') != null,
      { description: 'project onboarding form' }
    );

    expect(mounted.container.textContent).toContain('Create a project');
    expect(mounted.container.textContent).toContain('Tenant 1');

    await act(async () => {
      fireEvent.input(
        mounted?.container.querySelector('input[name="projectName"]') as HTMLInputElement,
        { target: { value: 'Orders' } }
      );
      fireEvent.submit(
        mounted?.container.querySelector('[data-slot="project-onboarding-form"]') as HTMLFormElement
      );
      await Promise.resolve();
    });

    await waitForReactQuery(() => onProjectCreated.mock.calls.length === 1, {
      description: 'project creation callback',
    });
    expect(createProject).toHaveBeenCalledWith({ tenantId: 'tenant-1', name: 'Orders' });
    expect(onProjectCreated).toHaveBeenCalledWith({
      project: {
        tenantId: 'tenant-1',
        projectId: 'orders',
        name: 'Orders',
        environmentIds: ['dev'],
      },
      effectiveWorkspace: {
        tenantId: 'tenant-1',
        projectId: 'orders',
        environmentId: 'dev',
      },
    });
  });

  it('presents existing projects before creation with explicit, localized actions', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    const onProjectSelected = vi.fn();

    mounted = await withTestQueryClient(
      <ProjectOnboardingView
        onProjectCreated={vi.fn()}
        onProjectSelected={onProjectSelected}
        service={buildProjectOnboardingService({
          listProjects: async () => ({
            tenants: [{ tenantId: 'tenant-1', canCreateProject: true }],
            projects: [
              {
                tenantId: 'tenant-1',
                projectId: 'ventas',
                name: 'Ventas',
                environmentIds: ['dev'],
              },
            ],
          }),
        })}
      />
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('Ventas') === true, {
      description: 'localized project onboarding catalog',
    });

    expect(mounted.container.textContent).toContain('Elige o crea un proyecto');
    expect(mounted.container.textContent).toContain('Proyectos disponibles');
    expect(mounted.container.textContent).toContain('Crear un proyecto');
    expect(mounted.container.textContent).toContain('Abrir proyecto');
    expect(mounted.container.textContent).not.toContain('Create a project');
    expect(
      mounted.container
        .querySelector('[data-slot="project-onboarding-title"]')
        ?.className.includes('text-xl')
    ).toBe(true);
    expect(
      mounted.container
        .querySelector('[data-slot="project-onboarding-root"]')
        ?.className.includes('bg-(--surface-app)')
    ).toBe(true);
  });
});
