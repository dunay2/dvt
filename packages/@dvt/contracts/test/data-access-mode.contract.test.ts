import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import {
  DataAccessSelectionSchema,
  DataPreviewProvenanceSchema,
  isWorkingDataTransitionAllowed,
  WorkingDataStateSchema,
} from '../src/index.js';

const readySelection = {
  mode: 'local',
  localDatasetId: 'dataset-1',
  generationId: 'generation-1',
} as const;
const sourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-1',
    provider: 'postgres',
  },
  sourceObjectId: 'relation/public.client',
} as const;

describe('DAM1 data access selection', () => {
  it('keeps the shared contract independent of Web, API and DuckDB adapters', () => {
    const source = ts.createSourceFile(
      'DataAccess.v1.ts',
      readFileSync(
        new URL('../src/contracts/data-access/DataAccess.v1.ts', import.meta.url),
        'utf8'
      ),
      ts.ScriptTarget.Latest
    );
    const dependencies = source.statements
      .filter(ts.isImportDeclaration)
      .map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text);
    expect(
      dependencies.some((dependency) =>
        /(?:@duckdb|apps\/|\/api\/|\/web\/|\/planner\/|\/engine\/)/u.test(dependency)
      )
    ).toBe(false);
  });

  it('accepts only explicit LIVE or a pinned LOCAL generation', () => {
    expect(DataAccessSelectionSchema.parse({ mode: 'live' })).toEqual({ mode: 'live' });
    expect(DataAccessSelectionSchema.parse(readySelection)).toEqual(readySelection);
  });

  it.each([
    { mode: 'auto' },
    { mode: 'hybrid' },
    { mode: 'live', generationId: 'generation-1' },
    { mode: 'local', localDatasetId: 'dataset-1' },
    { mode: 'local', generationId: 'generation-1' },
    { ...readySelection, sql: 'SELECT * FROM secret' },
    { ...readySelection, path: 'C:/data/workspace.duckdb' },
    { ...readySelection, credential: 'password' },
  ])('rejects ambiguous, unsupported or authority-bearing input %#', (selection) => {
    expect(DataAccessSelectionSchema.safeParse(selection).success).toBe(false);
  });
});

describe('DAM1 working-data state', () => {
  it.each([
    { status: 'absent' },
    { status: 'seed', captureId: 'capture-1' },
    { status: 'building', captureId: 'capture-1', previousReadyGenerationId: 'generation-0' },
    { status: 'ready', captureId: 'capture-1', generationId: 'generation-1' },
    { status: 'failed', captureId: 'capture-1', previousReadyGenerationId: 'generation-0' },
    { status: 'cancelled', captureId: 'capture-1' },
  ])('accepts explicit status %#', (state) => {
    expect(WorkingDataStateSchema.parse(state)).toEqual(state);
  });

  it.each([
    { status: 'ready' },
    { status: 'ready', generationId: '' },
    { status: 'building', generationId: 'generation-1' },
    { status: 'seed' },
    { status: 'failed', generationId: 'generation-1' },
    { status: 'complete', generationId: 'generation-1' },
  ])('rejects an ambiguous or provisional stable generation %#', (state) => {
    expect(WorkingDataStateSchema.safeParse(state).success).toBe(false);
  });

  it('admits only a same-attempt seed/build/ready progression and pinned refresh', () => {
    const absent = { status: 'absent' };
    const seed = { status: 'seed', captureId: 'capture-1' };
    const building = { status: 'building', captureId: 'capture-1' };
    const ready = { status: 'ready', captureId: 'capture-1', generationId: 'generation-1' };
    const refresh = {
      status: 'building',
      captureId: 'capture-2',
      previousReadyGenerationId: 'generation-1',
    };
    expect(isWorkingDataTransitionAllowed(absent, seed)).toBe(true);
    expect(isWorkingDataTransitionAllowed(seed, building)).toBe(true);
    expect(isWorkingDataTransitionAllowed(building, ready)).toBe(true);
    expect(isWorkingDataTransitionAllowed(ready, refresh)).toBe(true);
    expect(
      isWorkingDataTransitionAllowed(refresh, {
        status: 'failed',
        captureId: 'capture-2',
        previousReadyGenerationId: 'generation-1',
      })
    ).toBe(true);
  });

  it.each([
    [{ status: 'absent' }, { status: 'ready', captureId: 'capture-1', generationId: 'gen-1' }],
    [
      { status: 'seed', captureId: 'capture-1' },
      { status: 'building', captureId: 'capture-2' },
    ],
    [
      { status: 'building', captureId: 'capture-1' },
      { status: 'seed', captureId: 'capture-1' },
    ],
    [
      { status: 'ready', captureId: 'capture-1', generationId: 'gen-1' },
      { status: 'building', captureId: 'capture-2', previousReadyGenerationId: 'other' },
    ],
    [
      { status: 'building', captureId: 'capture-2', previousReadyGenerationId: 'gen-1' },
      { status: 'failed', captureId: 'capture-2' },
    ],
    [
      { status: 'building', captureId: 'capture-2', previousReadyGenerationId: 'gen-1' },
      { status: 'ready', captureId: 'capture-2', generationId: 'gen-1' },
    ],
    [
      { status: 'failed', captureId: 'capture-1' },
      { status: 'building', captureId: 'capture-1' },
    ],
    [{ status: 'unknown' }, { status: 'building', captureId: 'capture-1' }],
  ])('rejects invalid or identity-changing transition %#', (previous, next) => {
    expect(isWorkingDataTransitionAllowed(previous, next)).toBe(false);
  });
});

describe('DAM1 preview provenance', () => {
  const limit = 20;
  const capturedAt = '2026-10-01T10:00:00.000Z';

  it('distinguishes a source query from a local sample and a full local copy', () => {
    expect(
      DataPreviewProvenanceSchema.parse({
        mode: 'live',
        sourceRefs: [sourceRef],
        queriedAt: capturedAt,
        limit,
        navigation: 'bounded-first-page',
      })
    ).toMatchObject({ mode: 'live' });
    expect(
      DataPreviewProvenanceSchema.parse({
        ...readySelection,
        capturedAt,
        limit,
        coverage: { kind: 'sample' },
      })
    ).toMatchObject({ mode: 'local', coverage: { kind: 'sample' } });
    expect(
      DataPreviewProvenanceSchema.parse({
        ...readySelection,
        capturedAt,
        limit,
        coverage: { kind: 'full', eofObserved: true },
      })
    ).toMatchObject({ mode: 'local', coverage: { kind: 'full' } });
  });

  it.each([
    { ...readySelection, capturedAt, limit, coverage: { kind: 'full' } },
    { ...readySelection, capturedAt, limit, coverage: { kind: 'full', eofObserved: false } },
    { ...readySelection, capturedAt: 'later', limit, coverage: { kind: 'sample' } },
    { ...readySelection, capturedAt, limit, coverage: { kind: 'sample' }, queriedAt: capturedAt },
    {
      mode: 'live',
      sourceRefs: [sourceRef],
      queriedAt: capturedAt,
      limit,
      navigation: 'bounded-first-page',
      capturedAt,
    },
  ])('rejects false coverage or mixed provenance %#', (provenance) => {
    expect(DataPreviewProvenanceSchema.safeParse(provenance).success).toBe(false);
  });
});
