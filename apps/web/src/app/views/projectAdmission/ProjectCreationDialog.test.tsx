// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { ApiError } from '../../services/api/createApiClient';
import type { ProjectOnboardingService } from '../../services/projectOnboarding/projectOnboardingService';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { ProjectCreationDialog } from './ProjectCreationDialog';

function buildProjectOnboardingService(
  overrides: Partial<ProjectOnboardingService> = {}
): ProjectOnboardingService {
  return {
    listProjects: async () => ({
      tenants: [{ tenantId: 'organization-a', canCreateProject: true }],
      projects: [],
      integrityFindings: [],
    }),
    createProject: async ({ name }) => ({
      project: {
        tenantId: 'organization-a',
        projectId: 'orders',
        name,
        environmentIds: ['dev'],
      },
      defaultWorkspace: {
        tenantId: 'organization-a',
        projectId: 'orders',
        projectName: name,
        environmentId: 'dev',
      },
    }),
    ...overrides,
  };
}

function projectCreationApiError(reason: string): ApiError {
  return new ApiError({
    message: 'Request to /projects failed (409)',
    endpoint: '/projects',
    statusCode: 409,
    category: 'client',
    responseBody: {
      error: {
        type: 'conflict',
        reason,
      },
    },
  });
}

describe('ProjectCreationDialog', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    document.body.replaceChildren();
  });

  it('creates and activates a named project through the shared governed form', async () => {
    const createProject = vi.fn(buildProjectOnboardingService().createProject);
    const activateCreatedProject = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <ProjectCreationDialog
          activateCreatedProject={activateCreatedProject}
          onOpenChange={onOpenChange}
          open
          service={buildProjectOnboardingService({ createProject })}
        />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => document.body.querySelector('input[name="projectName"]') != null,
      { description: 'new project dialog form' }
    );

    expect(document.body.textContent).toContain('Crea un proyecto');
    expect(document.body.textContent).toContain('Nombre del proyecto');
    expect(document.body.textContent).not.toContain('Tenant');
    const dialog = document.body.querySelector('[role="dialog"]');
    const descriptionId = dialog?.getAttribute('aria-describedby');
    const description = descriptionId ? document.getElementById(descriptionId) : null;
    expect(description?.textContent).toBe(
      'Elige una organización autorizada y asigna al proyecto un nombre reconocible.'
    );
    expect(description?.classList.contains('sr-only')).toBe(true);
    const dialogContent = document.body.querySelector('[data-slot="project-creation-dialog"]');
    const dialogHeader = dialogContent?.querySelector('[data-slot="dialog-header"]');
    const formBody = dialogContent?.querySelector('[data-slot="project-creation-fields"]');
    const formActions = dialogContent?.querySelector('[data-slot="project-creation-actions"]');
    expect(dialogContent?.classList).toContain('gap-0');
    expect(dialogContent?.classList).toContain('p-0');
    expect(dialogHeader?.classList).toContain('py-5');
    expect(formBody?.classList).toContain('gap-4');
    expect(formBody?.classList).toContain('py-5');
    expect(formActions?.classList).toContain('border-t');
    expect(formActions?.classList).toContain('py-4');
    expect(dialogContent?.querySelector('[data-slot="label"]')).not.toBeNull();
    expect(dialogContent?.querySelector('[data-slot="input"]')).not.toBeNull();
    expect(dialogContent?.querySelector('[data-slot="button"]')).not.toBeNull();
    expect(formActions?.querySelector('[data-slot="dialog-close"]')).not.toBeNull();
    expect(document.activeElement).toBe(document.body.querySelector('input[name="projectName"]'));

    await act(async () => {
      fireEvent.input(document.body.querySelector('input[name="projectName"]')!, {
        target: { value: 'Ventas' },
      });
      fireEvent.submit(document.body.querySelector('[data-slot="project-creation-form"]')!);
      await Promise.resolve();
    });

    await waitForReactQuery(() => activateCreatedProject.mock.calls.length === 1, {
      description: 'created project activation',
    });
    expect(createProject).toHaveBeenCalledWith({
      tenantId: 'organization-a',
      name: 'Ventas',
    });
    expect(activateCreatedProject).toHaveBeenCalledWith(
      expect.objectContaining({ project: expect.objectContaining({ name: 'Ventas' }) })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the dialog open and reports activation failure without changing to success', async () => {
    const onOpenChange = vi.fn();
    const activateCreatedProject = vi.fn().mockRejectedValue(new Error('Project unavailable.'));

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <ProjectCreationDialog
          activateCreatedProject={activateCreatedProject}
          onOpenChange={onOpenChange}
          open
          service={buildProjectOnboardingService()}
        />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => document.body.querySelector('input[name="projectName"]') != null,
      { description: 'new project dialog form' }
    );

    await act(async () => {
      fireEvent.input(document.body.querySelector('input[name="projectName"]')!, {
        target: { value: 'Ventas' },
      });
      fireEvent.submit(document.body.querySelector('[data-slot="project-creation-form"]')!);
      await Promise.resolve();
    });

    await waitForReactQuery(
      () => document.body.textContent?.includes('Project unavailable.') === true,
      { description: 'activation failure' }
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(
      (document.body.querySelector('input[name="projectName"]') as HTMLInputElement).value
    ).toBe('Ventas');
  });

  it.each([
    {
      language: 'es',
      reason: 'duplicate_project_name',
      expectedMessage:
        'Ya existe un proyecto con ese nombre en esta organización. Elige otro nombre.',
    },
    {
      language: 'en',
      reason: 'duplicate_project_name',
      expectedMessage:
        'A project with that name already exists in this organization. Choose another name.',
    },
    {
      language: 'es',
      reason: 'idempotency_conflict',
      expectedMessage:
        'Ya no se puede confirmar esta solicitud de creación. Cierra el diálogo e inténtalo de nuevo.',
    },
    {
      language: 'es',
      reason: 'future_conflict',
      expectedMessage: 'No se pudo crear el proyecto. Inténtalo de nuevo.',
    },
  ] as const)(
    'presents $reason in $language without exposing transport details',
    async ({ language, reason, expectedMessage }) => {
      useApplicationLanguageStore.getState().configureApplicationLanguage(language);
      const onOpenChange = vi.fn();
      const createProject = vi
        .fn<ProjectOnboardingService['createProject']>()
        .mockRejectedValue(projectCreationApiError(reason));

      mounted = await withTestQueryClient(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <ProjectCreationDialog
            activateCreatedProject={vi.fn()}
            onOpenChange={onOpenChange}
            open
            service={buildProjectOnboardingService({ createProject })}
          />
        </AppServicesProvider>
      );

      await waitForReactQuery(
        () => document.body.querySelector('input[name="projectName"]') != null,
        { description: 'new project dialog form' }
      );

      const input = document.body.querySelector('input[name="projectName"]') as HTMLInputElement;
      await act(async () => {
        fireEvent.input(input, { target: { value: 'Prueba' } });
        fireEvent.submit(document.body.querySelector('[data-slot="project-creation-form"]')!);
        await Promise.resolve();
      });

      await waitForReactQuery(() => document.body.textContent?.includes(expectedMessage) === true, {
        description: 'localized project creation error',
      });
      expect(document.body.textContent).not.toContain('/projects');
      expect(document.body.textContent).not.toContain('409');
      expect(input.value).toBe('Prueba');
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    }
  );

  it.each([
    {
      interaction: 'Escape',
      close: () => fireEvent.keyDown(document, { key: 'Escape' }),
    },
    {
      interaction: 'close button',
      close: () => {
        const closeButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
          (button) => button.textContent?.includes('Cerrar el diálogo de nuevo proyecto')
        );
        fireEvent.click(closeButton!);
      },
    },
  ])('closes without creating through $interaction', async ({ close }) => {
    const createProject = vi.fn(buildProjectOnboardingService().createProject);
    const onOpenChange = vi.fn();

    mounted = await withTestQueryClient(
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <ProjectCreationDialog
          activateCreatedProject={vi.fn()}
          onOpenChange={onOpenChange}
          open
          service={buildProjectOnboardingService({ createProject })}
        />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => document.body.querySelector('input[name="projectName"]') != null,
      { description: 'new project dialog form' }
    );

    await act(async () => {
      close();
    });

    await waitForReactQuery(() => onOpenChange.mock.calls.some(([open]) => open === false), {
      description: 'new project dialog close',
    });
    expect(createProject).not.toHaveBeenCalled();
  });
});
