/**
 * Owned concern: mount and dispose the real Code entry or file surface for one test.
 * @decision Rendering never triggers reference analysis; scenarios request each action explicitly.
 * @consequence Test lifecycle and user commands are visible at their call sites.
 */
import './codeContextMonaco.test-adapter';
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { QueryClient } from '@tanstack/react-query';
import { within } from '@testing-library/dom';
import { act, createRef, type ReactNode } from 'react';
import { waitForReactQuery, withTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { SessionContextPort } from '../../ports/sessionContext';
import CodeView, { type CodeViewHandle } from '../CodeView';
import { WorkspaceFileCodeEditor } from './WorkspaceFileCodeEditor';
import type { CodeWorkspaceFileAccess } from './codeWorkspaceFileEditPosture';
import { resolveCodeInlineReferenceCopy } from './codeViewCopy';
import { createCodeContextWorkspaceFixture } from './codeContextWorkspace.test-fixture';

export function createCodeContextHarness(sessionContext?: SessionContextPort) {
  const { scenario, services, graph, analysis, save } = createCodeContextWorkspaceFixture();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const handle = createRef<CodeViewHandle>();
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
  const container = (): HTMLDivElement => {
    if (!mounted) throw new Error('Render the Code surface before interacting with it.');
    return mounted.container;
  };
  async function mount(surface: ReactNode): Promise<void> {
    const ui = (
      <AppServicesProvider
        overrides={{ ...services, ...(sessionContext ? { sessionContext } : {}) }}
      >
        {surface}
      </AppServicesProvider>
    );
    if (mounted) await mounted.render(ui);
    else mounted = await withTestQueryClient(ui, client);
  }
  return {
    scenario,
    graph,
    analysis,
    save,
    client,
    handle,
    get container() {
      return container();
    },
    renderEntry: () =>
      mount(
        <CodeView
          ref={handle}
          publishRouteBootstrap={false}
          fileScope={{ kind: 'workspace-files' }}
          initialPath={scenario.fixture.file.path}
        />
      ),
    renderFile: (
      access: CodeWorkspaceFileAccess = 'read-only',
      project?: DbtProjectGraphProjection
    ) =>
      mount(
        <WorkspaceFileCodeEditor
          ref={handle}
          access={access}
          authority="dbt-project-files"
          path={scenario.fixture.file.path}
          dbtProject={project}
        />
      ),
    async analyzeReferences(): Promise<void> {
      const copy = resolveCodeInlineReferenceCopy('en-US');
      await waitForReactQuery(() => {
        const button = within(container()).queryByRole<HTMLButtonElement>('button', {
          name: copy.analyzeLabel,
        });
        return button !== null && !button.disabled;
      });
      await act(async () =>
        within(container()).getByRole('button', { name: copy.analyzeLabel }).click()
      );
    },
    async cleanup(): Promise<void> {
      try {
        await mounted?.cleanup();
      } finally {
        mounted = undefined;
        client.clear();
      }
    },
    waitFor: waitForReactQuery,
  };
}
