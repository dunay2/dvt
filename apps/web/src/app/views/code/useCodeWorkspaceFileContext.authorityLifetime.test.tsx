// @vitest-environment jsdom
/** Reject stale, conflicting and revoked authority without claiming fresh reconciliation. */
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { useCodeWorkspaceFileContext } from './useCodeWorkspaceFileContext';
import type { FileContent } from '../../ports/workspace';
import { contextFixture } from './codeWorkspaceFileContext.test-support';

beforeEach(() => localStorage.clear());

describe('Code authoritative metadata lifetime', () => {
  it('discards late graph results and cached context after changing file or revoking its binding', async () => {
    const first = contextFixture();
    const second = contextFixture(undefined, 'second');
    let file: FileContent = first.file;
    let resolveOld!: (project: typeof first.project) => void;
    const old = new Promise<typeof first.project>((resolve) => {
      resolveOld = resolve;
    });
    const getProjectGraph = vi
      .fn()
      .mockImplementationOnce(() => old)
      .mockResolvedValue(second.project);
    let observed: ReturnType<typeof useCodeWorkspaceFileContext> | undefined;
    function Probe(): null {
      observed = useCodeWorkspaceFileContext({ file, project: undefined, allowed: true });
      return null;
    }
    const ui = (): JSX.Element => (
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>
    );
    const mounted = await withTestQueryClient(ui());
    try {
      await waitForReactQuery(() => getProjectGraph.mock.calls.length === 1);
      expect(observed?.status).toBe('checking');
      file = second.file;
      await mounted.render(ui());
      await waitForReactQuery(() => observed?.project === second.project);
      await act(async () => resolveOld(first.project));
      expect(observed?.project).toBe(second.project);
      file = {
        ...second.file,
        authoringAuthority: { kind: 'unresolved', reason: 'mixed_authority', canvasId: null },
      };
      await mounted.render(ui());
      expect(observed?.project).toBeUndefined();
      expect(observed?.reconcilePersistedFile).toBeUndefined();
      expect(observed?.status).toBe('unavailable');
      expect(getProjectGraph).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.cleanup();
    }
  });

  it.each(['revoked', 'conflicting'] as const)(
    'rejects %s metadata instead of retaining an explicit project',
    async (mode) => {
      const fixture = contextFixture();
      const file: FileContent = {
        ...fixture.file,
        authoringAuthority:
          mode === 'revoked'
            ? { kind: 'unresolved', reason: 'missing_authority', canvasId: null }
            : {
                kind: 'resolved',
                binding: { ...fixture.project.authorityBinding, canvasId: 'different-canvas' },
              },
      };
      const getProjectGraph = vi.fn(async () => fixture.project);
      let observed: ReturnType<typeof useCodeWorkspaceFileContext> | undefined;
      function Probe(): null {
        observed = useCodeWorkspaceFileContext({ file, project: fixture.project, allowed: true });
        return null;
      }
      const mounted = await withTestQueryClient(
        <AppServicesProvider
          overrides={{
            ...createAppServicesTestOverrides(),
            dbtProjectGraphQueryPort: { getProjectGraph },
          }}
        >
          <Probe />
        </AppServicesProvider>
      );
      try {
        expect(observed?.status).toBe('unavailable');
        expect(observed?.project).toBeUndefined();
        expect(getProjectGraph).not.toHaveBeenCalled();
      } finally {
        await mounted.cleanup();
      }
    }
  );

  it('keeps stale projections textual and does not treat query errors as fresh reconciliation', async () => {
    const fixture = contextFixture();
    const stale = { ...fixture.project, freshness: 'stale-last-valid' as const };
    const getProjectGraph = vi.fn(async () => stale);
    let observed: ReturnType<typeof useCodeWorkspaceFileContext> | undefined;
    function Probe(): null {
      observed = useCodeWorkspaceFileContext({
        file: fixture.file,
        project: undefined,
        allowed: true,
      });
      return null;
    }
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>
    );
    try {
      await waitForReactQuery(() => observed?.project === stale);
      const receipt = {
        kind: 'unchanged' as const,
        disposition: null,
        path: fixture.file.path,
        contentSha256: fixture.file.contentSha256,
        lastModified: fixture.file.lastModified,
      };
      await expect(observed?.reconcilePersistedFile?.(receipt)).resolves.toEqual({
        kind: 'degraded',
        freshness: 'stale-last-valid',
      });
      getProjectGraph.mockRejectedValue(new Error('query denied'));
      await expect(observed?.reconcilePersistedFile?.(receipt)).rejects.toThrow('query denied');
    } finally {
      await mounted.cleanup();
    }
  });
});
