// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtProjectImportDialogView } from './DbtProjectImportDialogView';
import type { DbtProjectImportPresentationModel } from './dbtProjectImportPresentationModel';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

function buildModel(
  overrides: Partial<DbtProjectImportPresentationModel> = {}
): DbtProjectImportPresentationModel {
  return {
    phase: 'accepted',
    projectRoot: 'analytics',
    canvasId: 'warehouse-analytics',
    status: { label: 'Ready to import', tone: 'success', busy: false },
    canValidate: true,
    canImport: true,
    project: { name: 'warehouse_analytics', adapter: 'postgres' },
    inventory: {
      fileCount: 2,
      includedFileCount: 1,
      excludedFileCount: 1,
      totalBytesLabel: '2.25 KiB',
      files: [
        {
          path: 'analytics/dbt_project.yml',
          classification: 'project-config',
          byteSizeLabel: '256 B',
          decisionLabel: 'Included',
          reason: null,
        },
        {
          path: 'analytics/target/manifest.json',
          classification: 'runtime-artifact',
          byteSizeLabel: '2 KiB',
          decisionLabel: 'Excluded',
          reason: 'Generated runtime artifact.',
        },
      ],
    },
    diagnostics: [
      {
        code: 'dbt_adapter_unavailable',
        severity: 'warning',
        message: 'Adapter unavailable for execution.',
        location: null,
      },
    ],
    failureMessage: null,
    receipt: null,
    ...overrides,
  };
}

describe('DbtProjectImportDialogView', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    vi.clearAllMocks();
  });

  it('renders the complete accepted report and delegates explicit commands', async () => {
    const onValidate = vi.fn();
    const onImport = vi.fn();

    await act(async () => {
      root.render(
        <DbtProjectImportDialogView
          open
          model={buildModel()}
          onOpenChange={vi.fn()}
          onProjectRootChange={vi.fn()}
          onCanvasIdChange={vi.fn()}
          onValidate={onValidate}
          onImport={onImport}
        />
      );
    });

    const dialog = document.body.querySelector('[data-slot="dbt-project-import-dialog"]');
    expect(dialog?.textContent).toContain('warehouse_analytics');
    expect(dialog?.textContent).toContain('postgres');
    expect(dialog?.textContent).toContain('2 files');
    expect(dialog?.textContent).toContain('2.25 KiB');
    expect(dialog?.textContent).toContain('analytics/target/manifest.json');
    expect(dialog?.textContent).toContain('Generated runtime artifact.');
    expect(dialog?.textContent).toContain('Adapter unavailable for execution.');

    fireEvent.click(document.body.querySelector('[data-slot="dbt-project-validate-command"]')!);
    fireEvent.click(document.body.querySelector('[data-slot="dbt-project-import-command"]')!);

    expect(onValidate).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('preserves an in-progress identity draft across an intermediate presentation rerender', async () => {
    const onProjectRootChange = vi.fn();
    const idleModel = buildModel({
      phase: 'idle',
      projectRoot: '',
      canvasId: '',
      status: { label: 'Not validated', tone: 'neutral', busy: false },
      canValidate: false,
      canImport: false,
      project: null,
      inventory: null,
      diagnostics: [],
    });

    const renderDialog = async (): Promise<void> => {
      await act(async () => {
        root.render(
          <DbtProjectImportDialogView
            open
            model={idleModel}
            onOpenChange={vi.fn()}
            onProjectRootChange={onProjectRootChange}
            onCanvasIdChange={vi.fn()}
            onValidate={vi.fn()}
            onImport={vi.fn()}
          />
        );
      });
    };

    await renderDialog();
    const projectRootInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="dbt-project-import-root"]'
    )!;
    projectRootInput.focus();
    fireEvent.input(projectRootInput, { target: { value: 'analytics' } });
    expect(onProjectRootChange).toHaveBeenLastCalledWith('analytics');

    await renderDialog();

    expect(
      document.body.querySelector<HTMLInputElement>('[data-slot="dbt-project-import-root"]')
    ).toBe(projectRootInput);
    expect(projectRootInput.value).toBe('analytics');
    expect(document.activeElement).toBe(projectRootInput);
  });

  it('keeps import disabled for rejected validation while preserving diagnostics', async () => {
    await act(async () => {
      root.render(
        <DbtProjectImportDialogView
          open
          model={buildModel({
            phase: 'rejected',
            status: { label: 'Validation rejected', tone: 'danger', busy: false },
            canImport: false,
            diagnostics: [
              {
                code: 'dbt_project_invalid',
                severity: 'error',
                message: 'dbt_project.yml is invalid.',
                location: 'analytics/dbt_project.yml, line 4',
              },
            ],
          })}
          onOpenChange={vi.fn()}
          onProjectRootChange={vi.fn()}
          onCanvasIdChange={vi.fn()}
          onValidate={vi.fn()}
          onImport={vi.fn()}
        />
      );
    });

    const importButton = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dbt-project-import-command"]'
    );
    expect(importButton?.disabled).toBe(true);
    expect(document.body.textContent).toContain('analytics/dbt_project.yml, line 4');
  });

  it('shows only the server-backed receipt as completed evidence', async () => {
    await act(async () => {
      root.render(
        <DbtProjectImportDialogView
          open
          model={buildModel({
            phase: 'imported',
            status: { label: 'Imported', tone: 'success', busy: false },
            canImport: false,
            receipt: {
              canvasId: 'warehouse-analytics',
              projectRoot: 'analytics',
              projectedResourceCount: 12,
              revision: '111111111111',
            },
          })}
          onOpenChange={vi.fn()}
          onProjectRootChange={vi.fn()}
          onCanvasIdChange={vi.fn()}
          onValidate={vi.fn()}
          onImport={vi.fn()}
        />
      );
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('12 projected resources');
      expect(document.body.textContent).toContain('111111111111');
    });
  });

  it('localizes dialog chrome and exposes an explicit cancel command', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    const onOpenChange = vi.fn();

    await act(async () => {
      root.render(
        <DbtProjectImportDialogView
          open
          model={buildModel()}
          onOpenChange={onOpenChange}
          onProjectRootChange={vi.fn()}
          onCanvasIdChange={vi.fn()}
          onValidate={vi.fn()}
          onImport={vi.fn()}
        />
      );
    });

    const dialog = document.body.querySelector('[data-slot="dbt-project-import-dialog"]');
    expect(dialog?.textContent).toContain('Importar proyecto dbt');
    expect(dialog?.textContent).toContain('Raíz del proyecto');
    expect(dialog?.textContent).toContain('Listo para importar');
    expect(dialog?.textContent).toContain('Cancelar');
    expect(dialog?.textContent).not.toContain('Validate project');

    fireEvent.click(document.body.querySelector('[data-slot="dbt-project-cancel-command"]')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps cancel available while validation or import work is in progress', async () => {
    const onOpenChange = vi.fn();

    await act(async () => {
      root.render(
        <DbtProjectImportDialogView
          open
          model={buildModel({
            phase: 'importing',
            status: { label: 'Importing project', tone: 'info', busy: true },
            canValidate: false,
            canImport: false,
          })}
          onOpenChange={onOpenChange}
          onProjectRootChange={vi.fn()}
          onCanvasIdChange={vi.fn()}
          onValidate={vi.fn()}
          onImport={vi.fn()}
        />
      );
    });

    const cancel = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dbt-project-cancel-command"]'
    );
    expect(cancel?.disabled).toBe(false);
    fireEvent.click(cancel!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('restores focus through the owning shell after cancellation', async () => {
    const onRestoreFocus = vi.fn();

    function Harness(): JSX.Element {
      const [open, setOpen] = useState(true);
      return (
        <DbtProjectImportDialogView
          open={open}
          model={buildModel()}
          onOpenChange={setOpen}
          onProjectRootChange={vi.fn()}
          onCanvasIdChange={vi.fn()}
          onRestoreFocus={onRestoreFocus}
          onValidate={vi.fn()}
          onImport={vi.fn()}
        />
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    const cancel = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dbt-project-cancel-command"]'
    );
    expect(cancel).not.toBeNull();
    await act(async () => {
      fireEvent.click(cancel!);
    });

    await waitFor(() => expect(onRestoreFocus).toHaveBeenCalledOnce());
  });
});
