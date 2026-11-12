// @vitest-environment jsdom
/** Reject missing or graph-owned context without granting Code editing authority. */
import { act } from 'react';
import { within } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mockGraphDraftAuthoringAuthority } from '../../../testing/workspacePortDoubles';
import type { WorkspaceGraphSnapshot } from '../../ports/workspace';
import { createCodeContextHarness } from './useCodeWorkspaceFileContext.test-harness';

describe('Code accepted file context through normal Code entry', () => {
  let h: ReturnType<typeof createCodeContextHarness>;
  beforeEach(() => {
    localStorage.clear();
    h = createCodeContextHarness();
  });
  afterEach(async () => {
    await h.cleanup();
  });

  it('inspects normal project Code read-only without saving or reconciling', async () => {
    await h.renderEntry();
    await h.waitFor(() => h.container.querySelector('[data-testid="code-file-viewer"]') !== null);
    expect(h.analysis).not.toHaveBeenCalled();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.graph).toHaveBeenCalledWith(h.scenario.fixture.project.authorityBinding);
    expect(h.analysis).toHaveBeenCalledWith(
      h.scenario.fixture.project.authorityBinding,
      'model.demo.ventas'
    );
    expect(h.container.querySelector('textarea')).toBeNull();
    const viewer = h.container.querySelector('[data-testid="code-file-viewer"]');
    expect(viewer?.textContent).toBe(h.scenario.fixture.file.content);
    expect(h.container.querySelector('[data-phase="read_only"]')).not.toBeNull();
    await act(async () => within(h.container).getByRole('button', { name: 'clientes' }).click());
    await h.waitFor(
      () =>
        h.container.querySelector('section[aria-label="clientes"] code')?.textContent === 'select 1'
    );
    expect(h.container.querySelector('[data-testid="code-file-viewer"]')).toBe(viewer);
    expect(h.graph).toHaveBeenCalledTimes(1);
    expect(h.analysis).toHaveBeenCalledTimes(1);
    expect(h.save).not.toHaveBeenCalled();
  });

  it.each(['missing', 'mixed', 'graph-owned'] as const)(
    'does not analyze %s context',
    async (kind) => {
      if (kind === 'graph-owned') h.scenario.graphOwned = true;
      else
        h.scenario.fileAuthority = {
          kind: 'unresolved',
          reason: kind === 'mixed' ? 'mixed_authority' : 'missing_authority',
          canvasId: null,
        };
      await h.renderEntry();
      await h.waitFor(() => h.container.textContent?.includes('ventas.sql') === true);
      expect(h.graph).not.toHaveBeenCalled();
      expect(h.analysis).not.toHaveBeenCalled();
      expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
      expect(h.save).not.toHaveBeenCalled();
    }
  );

  it('inspects server-authorized dbt references without granting editing when parent authority is missing', async () => {
    h.scenario.parentMissing = true;
    await h.renderEntry();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.container.querySelector('textarea')).toBeNull();
    expect(h.container.querySelector('pre')?.textContent).toBe(h.scenario.fixture.file.content);
    expect(h.save).not.toHaveBeenCalled();
    expect(h.container.querySelector('[data-phase="read_only"]')).not.toBeNull();
  });

  it('analyzes a server-authorized file reference without claiming its SQL as graph-generated', async () => {
    h.scenario.graphSnapshot = Promise.resolve({
      authoringAuthority: mockGraphDraftAuthoringAuthority,
      nodes: [
        {
          id: 'placed-model',
          name: 'ventas',
          type: 'MODEL',
          package: 'dvt',
          path: h.scenario.fixture.file.path,
          tags: [],
          status: 'idle',
          dependencies: [],
          metadata: {
            dbtModelReference: {
              schemaVersion: 'workspace-dbt-model-reference.v1',
              canvasId: h.scenario.fixture.project.authorityBinding.canvasId,
              uniqueId: 'model.demo.ventas',
              relationId: 'reference-relation',
              connectionRef: {
                schemaVersion: 'connection-ref.v1',
                provider: 'postgres',
                connectionId: 'warehouse',
              },
              fields: [
                { fieldId: 'client-field', name: 'client_id', dataType: 'text', nullable: true },
              ],
            },
          },
        },
      ],
      edges: [],
    });
    await h.renderEntry();
    await h.analyzeReferences();
    await h.waitFor(() => h.container.querySelectorAll('[data-reference]').length === 2);
    expect(h.analysis).toHaveBeenCalledTimes(1);
    expect(h.container.querySelector('textarea')).toBeNull();
    expect(h.save).not.toHaveBeenCalled();
  });

  it('waits for a pending graph ownership read before allowing file context queries', async () => {
    let resolveGraph!: (snapshot: WorkspaceGraphSnapshot) => void;
    h.scenario.graphSnapshot = new Promise((resolve) => {
      resolveGraph = resolve;
    });
    await h.renderEntry();
    expect(h.container.querySelector('pre')).toBeNull();
    expect(h.graph).not.toHaveBeenCalled();
    await act(async () =>
      resolveGraph({
        authoringAuthority: mockGraphDraftAuthoringAuthority,
        edges: [],
        nodes: [
          {
            id: 'owned',
            name: 'owned',
            type: 'MODEL',
            package: 'demo',
            path: h.scenario.fixture.file.path,
            tags: [],
            status: 'idle',
            dependencies: [],
          },
        ],
      })
    );
    await h.waitFor(() => h.container.querySelector('pre') != null);
    expect(h.graph).not.toHaveBeenCalled();
    expect(h.analysis).not.toHaveBeenCalled();
    expect(h.container.querySelectorAll('[data-reference]')).toHaveLength(0);
  });
});
