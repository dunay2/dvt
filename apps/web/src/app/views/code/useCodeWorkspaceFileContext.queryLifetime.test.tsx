// @vitest-environment jsdom
/** Prevent automatic retries and absent bindings from escaping graph query lifetime. */
import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { QueryClient } from '@tanstack/react-query';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { useCodeWorkspaceFileContext } from './useCodeWorkspaceFileContext';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import { queryKeys } from '../../queries/queryKeys';
import { contextFixture } from './codeWorkspaceFileContext.test-support';

beforeEach(() => localStorage.clear());

describe('Code graph query request lifetime', () => {
  it('does not retry a rejected graph analysis automatically and permits explicit recovery', async () => {
    const { project } = contextFixture();
    const authority = project.authorityBinding.authority;
    if (authority.kind !== 'dbt-project-files') throw new Error('Expected file-backed fixture.');
    const binding = { ...project.authorityBinding, authority };
    const failure = new Error('Project graph analysis request failed.');
    const getProjectGraph = vi.fn(async () => project).mockRejectedValue(failure);
    let observed: ReturnType<typeof useDbtProjectGraphQuery> | undefined;
    function Probe(): null {
      observed = useDbtProjectGraphQuery(binding);
      return null;
    }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: 1, retryDelay: 0 } },
    });
    const mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          dbtProjectGraphQueryPort: { getProjectGraph },
        }}
      >
        <Probe />
      </AppServicesProvider>,
      client
    );
    try {
      await waitForReactQuery(() => observed?.isError === true);
      expect(observed?.error).toBe(failure);
      expect(getProjectGraph).toHaveBeenCalledTimes(1);
      getProjectGraph.mockResolvedValue(project);
      await act(async () => {
        await observed?.refetch();
      });
      await waitForReactQuery(() => observed?.isSuccess === true);
      expect(observed?.data).toEqual(project);
      expect(getProjectGraph).toHaveBeenCalledTimes(2);
    } finally {
      await mounted.cleanup();
    }
  });

  it('revalidates the project when returning to an unchanged file after another file changed', async () => {
    const first = contextFixture();
    const nextProject = DbtProjectGraphProjectionSchema.parse({
      ...first.project,
      analysisSha256: sha256HexUtf8('analysis after YAML edit'),
      projectRevision: {
        ...first.project.projectRevision,
        contentSetSha256: sha256HexUtf8('updated project'),
      },
    });
    let file = first.file;
    let finishReturn!: (projection: DbtProjectGraphProjection) => void;
    const returning = new Promise<DbtProjectGraphProjection>((resolve) => {
      finishReturn = resolve;
    });
    const getProjectGraph = vi
      .fn()
      .mockResolvedValueOnce(first.project)
      .mockImplementationOnce(() => returning);
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
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60_000 } },
    });
    const mounted = await withTestQueryClient(ui(), client);
    try {
      await waitForReactQuery(() => observed?.project === first.project);
      file = {
        ...first.file,
        path: 'inline_code_demo/models/schema.yml',
        name: 'schema.yml',
        language: 'yaml',
        content: 'version: 2',
        contentSha256: sha256HexUtf8('version: 2'),
      };
      await mounted.render(ui());
      expect(observed?.project).toBeUndefined();
      expect(observed?.status).toBe('inactive');
      expect(getProjectGraph).toHaveBeenCalledTimes(1);
      file = first.file;
      await mounted.render(ui());
      expect(getProjectGraph).toHaveBeenCalledTimes(2);
      expect(observed?.project).toBeUndefined();
      expect(observed?.status).toBe('checking');
      await act(async () => finishReturn(nextProject));
      await waitForReactQuery(
        () => observed?.project?.analysisSha256 === nextProject.analysisSha256
      );
      expect(observed?.project).toEqual(nextProject);
    } finally {
      finishReturn(nextProject);
      await mounted.cleanup();
    }
  });

  it('never sends an absent binding, even for an explicit refetch, and isolates revision keys', async () => {
    const getProjectGraph = vi.fn(async () => contextFixture().project);
    let observed: ReturnType<typeof useDbtProjectGraphQuery> | undefined;
    function Probe(): null {
      observed = useDbtProjectGraphQuery(undefined);
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
      expect(getProjectGraph).not.toHaveBeenCalled();
      let failed = false;
      await act(async () => {
        failed = (await observed?.refetch())?.isError === true;
      });
      expect(failed).toBe(true);
      expect(getProjectGraph).not.toHaveBeenCalled();
      expect(
        queryKeys.workspace.dbtProjectGraph('t', 'p', 'dev', 'canvas', 'root', 'sha-a')
      ).not.toEqual(
        queryKeys.workspace.dbtProjectGraph('t', 'p', 'dev', 'canvas', 'root', 'sha-b')
      );
    } finally {
      await mounted.cleanup();
    }
  });
});
