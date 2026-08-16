// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import {
  CANVAS_DBT_SOURCE_IMPORT_CONTINUATION_STORAGE_KEY,
  resolveDbtSourceImportContinuation,
  useCanvasDbtSourceImportContinuationStore,
} from './canvasDbtSourceImportContinuationStore';

const AUTHORITY: DbtProjectFilesAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'analytics',
  authority: { kind: 'dbt-project-files', projectRoot: 'projects/analytics' },
};

const DECLARATIONS = [
  {
    uniqueId: 'source.analytics.raw.orders',
    filePath: 'models/sources.yml',
    sourceName: 'raw',
    tableName: 'orders',
    database: 'RAW',
    schema: 'ERP',
    identifier: 'ORDERS',
  },
] as const;

describe('Canvas dbt source import continuation store', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useCanvasDbtSourceImportContinuationStore.setState({ pending: null });
  });

  it('survives a route composition remount and is consumed only by its exact authority', () => {
    useCanvasDbtSourceImportContinuationStore.getState().enqueue(AUTHORITY, DECLARATIONS);
    const pending = useCanvasDbtSourceImportContinuationStore.getState().pending;

    expect(
      resolveDbtSourceImportContinuation(pending, {
        ...AUTHORITY,
        canvasId: 'another-canvas',
      })
    ).toBeUndefined();
    expect(resolveDbtSourceImportContinuation(pending, AUTHORITY)).toEqual({
      kind: 'dbt-source-binding',
      sourceTableDeclarations: DECLARATIONS,
    });

    useCanvasDbtSourceImportContinuationStore.getState().consume(AUTHORITY);

    expect(useCanvasDbtSourceImportContinuationStore.getState().pending).toBeNull();
  });

  it('rehydrates an unfinished continuation after a browser reload', async () => {
    useCanvasDbtSourceImportContinuationStore.getState().enqueue(AUTHORITY, DECLARATIONS);
    const persisted = window.sessionStorage.getItem(
      CANVAS_DBT_SOURCE_IMPORT_CONTINUATION_STORAGE_KEY
    );
    expect(persisted).not.toBeNull();

    useCanvasDbtSourceImportContinuationStore.setState({ pending: null });
    window.sessionStorage.setItem(
      CANVAS_DBT_SOURCE_IMPORT_CONTINUATION_STORAGE_KEY,
      persisted ?? ''
    );
    await useCanvasDbtSourceImportContinuationStore.persist.rehydrate();

    expect(
      resolveDbtSourceImportContinuation(
        useCanvasDbtSourceImportContinuationStore.getState().pending,
        AUTHORITY
      )
    ).toEqual({
      kind: 'dbt-source-binding',
      sourceTableDeclarations: DECLARATIONS,
    });
  });
});
