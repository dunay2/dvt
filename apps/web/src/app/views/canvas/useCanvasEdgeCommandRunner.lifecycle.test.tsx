// @vitest-environment jsdom
import { act, createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Edge } from '@xyflow/react';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';
import { getPluginPortMap } from '../../plugins/registry';
import { SOURCE, TRANSFORM } from './canvasOutputProjection.test-support';
import type { CanvasDraftSession } from './canvasDraftSession';
import * as admission from './canvasEdgeAdmissionTransaction';
import {
  useCanvasEdgeCommandRunner,
  type CanvasEdgeCommandRunner,
} from './useCanvasEdgeCommandRunner';

afterEach(() => vi.restoreAllMocks());

describe('Canvas pending edge command lifetime', () => {
  it.each(['unchanged', 'draft', 'catalog', 'permission', 'unmount'] as const)(
    'publishes only a current, authorized command: %s',
    async (change) => {
      let release!: () => void;
      let started!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      const queried = new Promise<void>((resolve) => {
        started = resolve;
      });
      const resolveTransaction = admission.resolveCanvasEdgeCreationTransaction;
      vi.spyOn(admission, 'resolveCanvasEdgeCreationTransaction').mockImplementation(
        async (args) => {
          const result = await resolveTransaction(args);
          expect(result.outcome).toBe('created');
          started();
          await pending;
          return result;
        }
      );
      let draftSession: CanvasDraftSession = {
        syncState: 'editing',
        baseline: { record: null },
        draftRevision: 'revision-a',
        workingSet: {
          visibleNodeIds: [SOURCE.id, TRANSFORM.id],
          visibleEdges: [],
          pendingExplicitNodeIds: [],
        },
      };
      let canonicalNodesById = new Map([SOURCE, TRANSFORM].map((node) => [node.id, node]));
      const edges: Edge[] = [];
      const effects = { setEdges: vi.fn(), setDraftSession: vi.fn() };
      const pluginPortMap = getPluginPortMap();
      const onCreated = vi.fn();
      let canEditEdges = true;
      let runner!: CanvasEdgeCommandRunner;
      function Probe(): null {
        runner = useCanvasEdgeCommandRunner({
          state: { canonicalNodesById, draftSession, edges },
          effects,
          pluginPortMap,
          canEditEdges,
        });
        return null;
      }
      const mounted = await withTestQueryClient(createElement(Probe));
      let unmounted = false;
      try {
        const command = runner.createConnection({
          connection: {
            source: SOURCE.id,
            target: TRANSFORM.id,
            sourceHandle: null,
            targetHandle: null,
          },
          onCreated,
        });
        await queried;
        expect(effects.setEdges).not.toHaveBeenCalled();
        if (change === 'draft') draftSession = { ...draftSession, draftRevision: 'revision-b' };
        if (change === 'catalog') canonicalNodesById = new Map(canonicalNodesById);
        if (change === 'permission') canEditEdges = false;
        if (change === 'unmount') {
          await mounted.cleanup();
          unmounted = true;
        } else await mounted.render(createElement(Probe));
        await act(async () => {
          release();
          await command;
        });
        const result = await command;
        expect(result.outcome).toBe(change === 'unchanged' ? 'created' : 'noop');
        expect(effects.setEdges).toHaveBeenCalledTimes(change === 'unchanged' ? 1 : 0);
        expect(effects.setDraftSession).toHaveBeenCalledTimes(change === 'unchanged' ? 1 : 0);
        expect(onCreated).toHaveBeenCalledTimes(change === 'unchanged' ? 1 : 0);
      } finally {
        release();
        if (!unmounted) await mounted.cleanup();
      }
    }
  );
});
