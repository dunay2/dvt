// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { contextFixture } from '../views/code/codeWorkspaceFileContext.test-support';
import {
  persistDbtSelectedModelAnalysis,
  restoreDbtSelectedModelAnalysis,
} from './dbtSelectedModelAnalysisCache';
import { queryKeys } from './queryKeys';

const { analysis } = contextFixture();
const key = queryKeys.workspace.dbtSelectedModelAnalysis(
  'tenant',
  'project',
  'dev',
  analysis.authorityBinding.canvasId,
  analysis.projectRevision.projectRoot,
  analysis.selectedUniqueId,
  `${analysis.analysisSha256}:${analysis.projectRevision.contentSetSha256}`
);

function projectKey(projectId: string): typeof key {
  return queryKeys.workspace.dbtSelectedModelAnalysis(
    key[2],
    projectId,
    key[4],
    key[5],
    key[6],
    key[7],
    key[8]
  );
}

describe('durable selected-model query evidence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('restores validated evidence without an expiry based on elapsed time', () => {
    persistDbtSelectedModelAnalysis(key, analysis);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 365 * 24 * 60 * 60 * 1000);
    expect(restoreDbtSelectedModelAnalysis(key)).toEqual(analysis);
  });

  it.each([2, 3, 4, 5, 6, 7, 8])('isolates query identity field %i', (index) => {
    persistDbtSelectedModelAnalysis(key, analysis);
    const changed = [...key];
    changed[index] = 'different';
    expect(restoreDbtSelectedModelAnalysis(changed as unknown as typeof key)).toBeUndefined();
  });

  it.each([
    { ...analysis, authorityBinding: { ...analysis.authorityBinding, canvasId: 'other' } },
    { ...analysis, selectedUniqueId: 'model.demo.other' },
    { ...analysis, analysisSha256: '0'.repeat(64) },
    {
      ...analysis,
      projectRevision: { ...analysis.projectRevision, contentSetSha256: '0'.repeat(64) },
    },
    { ...analysis, status: 'unavailable' },
    { compiled: true },
  ])('rejects evidence outside the current binding, revision or ready contract (%#)', (value) => {
    persistDbtSelectedModelAnalysis(key, value);
    expect(restoreDbtSelectedModelAnalysis(key)).toBeUndefined();
    expect(localStorage.length).toBe(0);
  });

  it('recovers from malformed storage and rejects a corrupted ready result', () => {
    persistDbtSelectedModelAnalysis(key, analysis);
    const name = localStorage.key(0)!;
    const original = localStorage.getItem(name)!;
    localStorage.setItem(name, original.replace(analysis.analysisSha256, '0'.repeat(64)));
    expect(restoreDbtSelectedModelAnalysis(key)).toBeUndefined();
    localStorage.setItem(name, '{');
    expect(restoreDbtSelectedModelAnalysis(key)).toBeUndefined();
    persistDbtSelectedModelAnalysis(key, analysis);
    expect(restoreDbtSelectedModelAnalysis(key)).toEqual(analysis);
  });

  it('retains only eight recent entries and does not let an oversized entry evict valid evidence', () => {
    for (let i = 0; i < 9; i++) {
      persistDbtSelectedModelAnalysis(projectKey(`project-${i}`), analysis);
    }
    expect(restoreDbtSelectedModelAnalysis(projectKey('project-0'))).toBeUndefined();
    expect(restoreDbtSelectedModelAnalysis(projectKey('project-1'))).toEqual(analysis);
    const oversized = {
      ...analysis,
      identities: analysis.identities.map((identity) => ({
        ...identity,
        name: 'x'.repeat(1024 * 1024),
      })),
    };
    persistDbtSelectedModelAnalysis(key, oversized);
    expect(restoreDbtSelectedModelAnalysis(projectKey('project-1'))).toEqual(analysis);
    expect(restoreDbtSelectedModelAnalysis(key)).toBeUndefined();
  });

  it('treats denied or exhausted storage as a miss without breaking the live result', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(() => persistDbtSelectedModelAnalysis(key, analysis)).not.toThrow();
    expect(restoreDbtSelectedModelAnalysis(key)).toBeUndefined();
  });
});
