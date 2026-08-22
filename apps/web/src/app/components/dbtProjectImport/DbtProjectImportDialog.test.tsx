// @vitest-environment jsdom

import {
  DbtProjectImportResultSchema,
  DbtProjectImportValidationReportSchema,
} from '@dvt/contracts';
import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDbtProjectImportPort } from '../../ports/dbtProjectImport';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { DbtProjectImportDialog } from './DbtProjectImportDialog';

const VALIDATION_REPORT = DbtProjectImportValidationReportSchema.parse({
  schemaVersion: 'dbt-project-import-validation-report.v1',
  status: 'accepted',
  projectRoot: 'analytics',
  projectName: 'warehouse_analytics',
  adapterType: 'postgres',
  inventory: {
    fileCount: 1,
    totalBytes: 128,
    includedFileCount: 1,
    excludedFileCount: 0,
    files: [
      {
        path: 'analytics/dbt_project.yml',
        classification: 'project-config',
        byteSize: 128,
        decision: 'included',
      },
    ],
  },
  diagnostics: [],
  sourceTableDeclarations: [
    {
      uniqueId: 'source.warehouse_analytics.raw.orders',
      filePath: 'models/sources.yml',
      sourceName: 'raw',
      tableName: 'orders',
      database: 'RAW',
      schema: 'ERP',
      identifier: 'ORDERS',
    },
  ],
  receipt: {
    schemaVersion: 'dbt-project-import-validation-receipt.v1',
    projectRoot: 'analytics',
    contentSetSha256: '1'.repeat(64),
    analysisSha256: '2'.repeat(64),
    validationSha256: '3'.repeat(64),
    policyVersion: 'dbt-project-import-policy.v1',
    validatedAt: '2026-07-15T10:00:00.000Z',
  },
});

const IMPORT_RESULT = DbtProjectImportResultSchema.parse({
  schemaVersion: 'dbt-project-import-result.v1',
  success: true,
  idempotencyKey: 'dbt-project-import:warehouse-analytics:00000000-0000-4000-8000-000000000000',
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: 'warehouse-analytics',
    authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
  },
  projectRevision: {
    projectRoot: 'analytics',
    contentSetSha256: '1'.repeat(64),
    analyzedAt: '2026-07-15T10:00:01.000Z',
    analyzerVersion: 'dbt-cli-v1',
  },
  analysisSha256: '2'.repeat(64),
  projectedResourceCount: 8,
  importedAt: '2026-07-15T10:00:02.000Z',
});

describe('DbtProjectImportDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('crypto', {
      getRandomValues: (target: Uint8Array) => {
        target.fill(0);
        return target;
      },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('invalidates accepted validation after identity changes and imports from the real receipt', async () => {
    const validateProject = vi.fn(async () => VALIDATION_REPORT);
    const importProject = vi.fn(async () => IMPORT_RESULT);
    const port: IDbtProjectImportPort = { validateProject, importProject };
    const onImported = vi.fn();

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ dbtProjectImportPort: port }}>
          <DbtProjectImportDialog open onClose={vi.fn()} onImported={onImported} />
        </AppServicesProvider>
      );
    });

    const projectRootInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="dbt-project-import-root"]'
    )!;
    const canvasIdInput = document.body.querySelector<HTMLInputElement>(
      '[data-slot="dbt-project-import-canvas-id"]'
    )!;
    await act(async () => {
      fireEvent.change(projectRootInput, { target: { value: 'analytics' } });
      fireEvent.change(canvasIdInput, { target: { value: 'warehouse-analytics' } });
      fireEvent.click(document.body.querySelector('[data-slot="dbt-project-validate-command"]')!);
    });

    await waitFor(() => {
      expect(validateProject).toHaveBeenCalledWith({
        schemaVersion: 'validate-dbt-project-import-request.v1',
        projectRoot: 'analytics',
      });
      expect(
        document.body.querySelector<HTMLButtonElement>('[data-slot="dbt-project-import-command"]')
          ?.disabled
      ).toBe(false);
    });

    await act(async () => {
      fireEvent.change(canvasIdInput, { target: { value: 'warehouse-analytics-v2' } });
    });
    expect(
      document.body.querySelector<HTMLButtonElement>('[data-slot="dbt-project-import-command"]')
        ?.disabled
    ).toBe(true);
    expect(document.body.textContent).not.toContain('warehouse_analytics');

    await act(async () => {
      fireEvent.change(canvasIdInput, { target: { value: 'warehouse-analytics' } });
      fireEvent.click(document.body.querySelector('[data-slot="dbt-project-validate-command"]')!);
    });
    await waitFor(() => {
      expect(
        document.body.querySelector<HTMLButtonElement>('[data-slot="dbt-project-import-command"]')
          ?.disabled
      ).toBe(false);
    });
    await act(async () => {
      fireEvent.click(document.body.querySelector('[data-slot="dbt-project-import-command"]')!);
    });

    await waitFor(() => {
      expect(importProject).toHaveBeenCalledWith({
        schemaVersion: 'import-dbt-project-command.v1',
        canvasId: 'warehouse-analytics',
        conflictPolicy: 'require-unbound-canvas',
        idempotencyKey:
          'dbt-project-import:warehouse-analytics:00000000-0000-4000-8000-000000000000',
        validationReceipt: VALIDATION_REPORT.status === 'accepted' && VALIDATION_REPORT.receipt,
      });
      expect(onImported).toHaveBeenCalledWith(
        IMPORT_RESULT,
        VALIDATION_REPORT.status === 'accepted' ? VALIDATION_REPORT.sourceTableDeclarations : []
      );
    });
  });
});
