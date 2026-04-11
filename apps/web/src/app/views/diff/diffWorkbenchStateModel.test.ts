import { describe, expect, it } from 'vitest';

import type { DbtNode, DiffChange } from '../../types/dbt';
import {
  buildDiffCompareContextState,
  buildDiffSqlContextState,
  buildDiffWorkbenchState,
} from './diffWorkbenchStateModel';

function buildChange(overrides?: Partial<DiffChange>): DiffChange {
  return {
    id: 'change-1',
    nodeId: 'fct_sales',
    type: 'changed',
    severity: 'info',
    description: 'Added filter',
    ...overrides,
  };
}

function buildNode(overrides?: Partial<DbtNode>): DbtNode {
  return {
    id: 'fct_sales',
    name: 'fct_sales',
    type: 'MODEL',
    package: 'analytics',
    path: 'models/marts/fct_sales.sql',
    tags: [],
    status: 'success',
    dependencies: [],
    ...overrides,
  };
}

describe('diffWorkbenchStateModel', () => {
  it('returns loading while diff changes are pending with no data', () => {
    expect(
      buildDiffWorkbenchState({
        diffChanges: [],
        isLoadingDiffChanges: true,
        diffChangesError: null,
        diffChangesErrorMessage: 'Unable to load diff changes.',
      })
    ).toEqual({ kind: 'loading' });
  });

  it('returns error when diff changes fail before any data is available', () => {
    expect(
      buildDiffWorkbenchState({
        diffChanges: [],
        isLoadingDiffChanges: false,
        diffChangesError: new Error('Diff failed'),
        diffChangesErrorMessage: 'Diff failed',
      })
    ).toEqual({ kind: 'error', message: 'Diff failed' });
  });

  it('returns empty when no diff changes are available', () => {
    expect(
      buildDiffWorkbenchState({
        diffChanges: [],
        isLoadingDiffChanges: false,
        diffChangesError: null,
        diffChangesErrorMessage: 'Unable to load diff changes.',
      })
    ).toEqual({ kind: 'empty' });
  });

  it('returns ready when diff changes exist', () => {
    expect(
      buildDiffWorkbenchState({
        diffChanges: [buildChange()],
        isLoadingDiffChanges: false,
        diffChangesError: null,
        diffChangesErrorMessage: 'Unable to load diff changes.',
      })
    ).toEqual({ kind: 'ready' });
  });

  it('returns loading while graph context is pending', () => {
    expect(
      buildDiffCompareContextState({
        primaryNode: null,
        isLoadingGraphSnapshot: true,
        graphSnapshotError: null,
      })
    ).toEqual({ kind: 'loading' });
  });

  it('returns unavailable when graph context fails', () => {
    expect(
      buildDiffCompareContextState({
        primaryNode: buildNode(),
        isLoadingGraphSnapshot: false,
        graphSnapshotError: new Error('Graph failed'),
      })
    ).toEqual({ kind: 'unavailable' });
  });

  it('returns unavailable when no primary compare node can be resolved', () => {
    expect(
      buildDiffCompareContextState({
        primaryNode: null,
        isLoadingGraphSnapshot: false,
        graphSnapshotError: null,
      })
    ).toEqual({ kind: 'unavailable' });
  });

  it('returns ready when graph context and primary node exist', () => {
    expect(
      buildDiffCompareContextState({
        primaryNode: buildNode(),
        isLoadingGraphSnapshot: false,
        graphSnapshotError: null,
      })
    ).toEqual({ kind: 'ready' });
  });

  it('returns loading while SQL preview content is still pending', () => {
    expect(
      buildDiffSqlContextState({
        primaryNode: buildNode(),
        isLoadingGraphSnapshot: false,
        graphSnapshotError: null,
        isLoadingFileContent: true,
        fileContentError: null,
        fileContentErrorMessage: 'Unable to load SQL preview.',
        hasFileContent: false,
      })
    ).toEqual({ kind: 'loading' });
  });

  it('returns error when SQL preview content fails after graph context resolves', () => {
    expect(
      buildDiffSqlContextState({
        primaryNode: buildNode(),
        isLoadingGraphSnapshot: false,
        graphSnapshotError: null,
        isLoadingFileContent: false,
        fileContentError: new Error('Workspace preview offline'),
        fileContentErrorMessage: 'Workspace preview offline',
        hasFileContent: false,
      })
    ).toEqual({ kind: 'error', message: 'Workspace preview offline' });
  });

  it('returns unavailable for SQL preview when no compare node is available', () => {
    expect(
      buildDiffSqlContextState({
        primaryNode: null,
        isLoadingGraphSnapshot: false,
        graphSnapshotError: null,
        isLoadingFileContent: false,
        fileContentError: null,
        fileContentErrorMessage: 'Unable to load SQL preview.',
        hasFileContent: false,
      })
    ).toEqual({ kind: 'unavailable' });
  });

  it('returns ready when graph context and SQL preview content both exist', () => {
    expect(
      buildDiffSqlContextState({
        primaryNode: buildNode(),
        isLoadingGraphSnapshot: false,
        graphSnapshotError: null,
        isLoadingFileContent: false,
        fileContentError: null,
        fileContentErrorMessage: 'Unable to load SQL preview.',
        hasFileContent: true,
      })
    ).toEqual({ kind: 'ready' });
  });
});
