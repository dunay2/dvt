// @vitest-environment jsdom

import { DbtSelectedModelAnalysisSchema, type DbtSelectedModelAnalysis } from '@dvt/contracts';
import { act, createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import type { SessionContextPort, WorkspaceScope } from '../ports/sessionContext';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useDbtSelectedModelAnalysisQuery } from './dbtSelectedModelAnalysisQueries';
import { queryKeys } from './queryKeys';

const binding: DbtProjectFilesAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'canvas-a',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
};
const selectedUniqueId = 'model.analytics.orders';
const scopeA: WorkspaceScope = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  targetAdapter: 'temporal',
};

function analysisWithRevision(digest: string): DbtSelectedModelAnalysis {
  return DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'unavailable',
    authorityBinding: binding,
    selectedUniqueId,
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256: digest,
      analyzedAt: '2026-10-29T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v2',
    },
    analysisSha256: digest,
    selectedAnalysisSha256: digest,
    capabilitySet: {
      analyzerVersion: 'dvt-dbt-analyzer.v2',
      supportedRegionKinds: ['ref', 'source'],
      capabilitySetSha256: digest,
    },
    files: [],
    identities: [],
    dependencies: [],
    regions: [],
    diagnostics: [
      {
        code: 'dbt_analyzer_unavailable',
        severity: 'error',
        message: 'Unavailable',
        subject: { kind: 'project' },
      },
    ],
  });
}

describe('selected dbt model analysis query', () => {
  it.each([
    [undefined, selectedUniqueId, true],
    [binding, undefined, true],
    [binding, ' ', true],
    [binding, selectedUniqueId, false],
  ] as const)(
    'does not request without complete enabled context (%#)',
    async (context, identity, enabled) => {
      const analyzeSelectedModel = vi.fn(async () => analysisWithRevision('1'.repeat(64)));
      function Probe(): null {
        useDbtSelectedModelAnalysisQuery(context, identity, { enabled });
        return null;
      }
      const mounted = await withTestQueryClient(
        createElement(AppServicesProvider, {
          overrides: {
            ...createAppServicesTestOverrides(),
            dbtSelectedModelAnalysisQueryPort: { analyzeSelectedModel },
          },
          children: createElement(Probe),
        })
      );
      try {
        expect(analyzeSelectedModel).not.toHaveBeenCalled();
      } finally {
        await mounted.cleanup();
      }
    }
  );

  it('isolates every workspace, authority, identity and revision dimension in cache keys', () => {
    const original = [
      'tenant-a',
      'project-a',
      'dev',
      'canvas-a',
      'analytics',
      selectedUniqueId,
      'revision-a',
    ] as const;
    const key = queryKeys.workspace.dbtSelectedModelAnalysis(...original);
    original.forEach((_, index) => {
      const changed: [string, string, string, string, string, string, string] = [...original];
      changed[index] += '-other';
      expect(queryKeys.workspace.dbtSelectedModelAnalysis(...changed)).not.toEqual(key);
    });
  });

  it('does not replace the new revision with a late result for the old revision', async () => {
    let revisionToken = 'revision-a';
    let resolveOld: ((analysis: DbtSelectedModelAnalysis) => void) | undefined;
    const oldResult = new Promise<DbtSelectedModelAnalysis>((resolve) => {
      resolveOld = resolve;
    });
    const latest = analysisWithRevision('2'.repeat(64));
    const analyzeSelectedModel = vi
      .fn()
      .mockImplementationOnce(() => oldResult)
      .mockResolvedValue(latest);
    let observed: ReturnType<typeof useDbtSelectedModelAnalysisQuery> | undefined;
    function Probe(): null {
      observed = useDbtSelectedModelAnalysisQuery(binding, selectedUniqueId, { revisionToken });
      return null;
    }
    const overrides = {
      ...createAppServicesTestOverrides(),
      dbtSelectedModelAnalysisQueryPort: { analyzeSelectedModel },
    };
    const ui = (): ReturnType<typeof createElement> =>
      createElement(AppServicesProvider, { overrides, children: createElement(Probe) });
    const mounted = await withTestQueryClient(ui());
    try {
      await waitForReactQuery(() => analyzeSelectedModel.mock.calls.length === 1);
      revisionToken = 'revision-b';
      await mounted.render(ui());
      await waitForReactQuery(() => observed?.data === latest);
      await act(async () => {
        resolveOld?.(analysisWithRevision('1'.repeat(64)));
      });
      expect(observed?.data).toBe(latest);
      expect(analyzeSelectedModel).toHaveBeenCalledTimes(2);
      expect(analyzeSelectedModel).toHaveBeenLastCalledWith(binding, selectedUniqueId);
    } finally {
      await mounted.cleanup();
    }
  });

  it('uses a new scoped cache when the granted workspace changes', async () => {
    let scope = scopeA;
    const subscribers = new Set<() => void>();
    const sessionContext: SessionContextPort = {
      getWorkspaceScope: () => scope,
      getWorkspaceScopeSnapshot: () => scope,
      subscribeWorkspaceScope: (subscriber) => {
        subscribers.add(subscriber);
        return () => {
          subscribers.delete(subscriber);
        };
      },
      buildRunContext: () => {
        throw new Error('Run context is outside this query.');
      },
    };
    const analyzeSelectedModel = vi.fn(async () =>
      analysisWithRevision(scope.projectId === 'project-a' ? '1'.repeat(64) : '2'.repeat(64))
    );
    let observed: ReturnType<typeof useDbtSelectedModelAnalysisQuery> | undefined;
    function Probe(): null {
      observed = useDbtSelectedModelAnalysisQuery(binding, selectedUniqueId, {
        revisionToken: 'same-revision-label',
      });
      return null;
    }
    const mounted = await withTestQueryClient(
      createElement(AppServicesProvider, {
        overrides: {
          ...createAppServicesTestOverrides(),
          sessionContext,
          dbtSelectedModelAnalysisQueryPort: { analyzeSelectedModel },
        },
        children: createElement(Probe),
      })
    );
    try {
      await waitForReactQuery(() => observed?.data?.analysisSha256 === '1'.repeat(64));
      expect(
        mounted.queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey)
      ).toContainEqual(
        queryKeys.workspace.dbtSelectedModelAnalysis(
          'tenant-a',
          'project-a',
          'dev',
          binding.canvasId,
          'analytics',
          selectedUniqueId,
          'same-revision-label'
        )
      );
      await act(async () => {
        scope = { ...scopeA, projectId: 'project-b', environmentId: 'stage' };
        subscribers.forEach((subscriber) => subscriber());
      });
      await waitForReactQuery(() => observed?.data?.analysisSha256 === '2'.repeat(64));
      expect(analyzeSelectedModel).toHaveBeenCalledTimes(2);
      const keys = mounted.queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey);
      expect(keys).toContainEqual(
        queryKeys.workspace.dbtSelectedModelAnalysis(
          'tenant-a',
          'project-b',
          'stage',
          binding.canvasId,
          'analytics',
          selectedUniqueId,
          'same-revision-label'
        )
      );
    } finally {
      await mounted.cleanup();
    }
  });
});
