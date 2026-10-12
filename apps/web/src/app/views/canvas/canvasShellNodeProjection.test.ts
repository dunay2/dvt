import { describe, expect, it, vi } from 'vitest';
import type { Node } from '@xyflow/react';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { projectCanvasShellNodes } from './canvasShellNodeProjection';
import { resolveWorkspaceFilePath } from './canvasWorkspaceFilePath';
import { canvasColumnTruth } from './canvasPresentationColumns';

function node(id: string, data: Partial<DbtNodeData> = {}): Node<DbtNodeData> {
  return { id, position: { x: 0, y: 0 }, data: { name: id, status: 'idle', ...data } };
}

const projection = {
  modelIds: new Set<string>(),
  openModel: vi.fn(),
  inspectOutput: vi.fn(),
  previewLabel: 'Preview',
  projectSample: () => ({ canOpen: false }),
  runSnapshot: undefined,
} satisfies Parameters<typeof projectCanvasShellNodes>[1];

describe('Canvas card projection without shell or DOM', () => {
  it('uses declared workspace paths without fabricating model files', () => {
    expect(resolveWorkspaceFilePath({})).toBeNull();
    expect(resolveWorkspaceFilePath({ path: ' ' })).toBeNull();
    expect(resolveWorkspaceFilePath({ path: 'models/model.sql' })).toBe('models/model.sql');
    expect(
      resolveWorkspaceFilePath({
        path: 'stale.sql',
        presentationTruth: {
          columns: canvasColumnTruth([], []),
          code: { kind: 'workspace-file', path: 'canonical.sql', language: 'sql' },
        },
      })
    ).toBe('canonical.sql');
  });

  it.each([
    { kind: 'generated', content: 'select 1', path: 'models/model.sql', language: 'sql' },
    {
      kind: 'canonical',
      content: '{}',
      language: 'json',
      schemaVersion: 'dvt-substrait-semantic-document.v1',
      digest: 'a'.repeat(64),
    },
  ] satisfies NonNullable<DbtNodeData['presentationTruth']>['code'][])(
    'exposes $kind code through the existing inspector callback',
    (code) => {
      const inspect = vi.fn();
      const source = node('model', {
        presentationTruth: { code, columns: canvasColumnTruth([], []) },
        onInspectNode: inspect,
      });
      const result = projectCanvasShellNodes([source], projection)[0]!.data as DbtNodeData;
      expect(result.canOpenNodeCode).toBe(true);
      expect(result.onInspectNode).toBe(inspect);
      result.onInspectNode?.('model', 'code');
      expect(inspect).toHaveBeenCalledExactlyOnceWith('model', 'code');
      expect(source.data.canOpenNodeCode).toBeUndefined();
    }
  );

  it('keeps explicit code denial and unavailable Preview while routing Source to Properties', () => {
    const inspect = vi.fn();
    const source = node('source', {
      role: 'input',
      path: 'source.sql',
      canOpenNodeCode: false,
      onInspectNode: inspect,
    });
    const data = projectCanvasShellNodes([source], projection)[0]!.data as DbtNodeData;
    data.onOpenNode?.('source');
    expect(inspect).toHaveBeenCalledExactlyOnceWith('source', 'general');
    expect(data.canOpenNodeCode).toBe(false);
    expect(data.onOpenSourceDataSample).toBeUndefined();
    expect(data.dataActionLabel).toBeUndefined();
  });

  it('routes an admitted Model to its editor and forwards Preview without acquiring data', () => {
    const openModel = vi.fn();
    const preview = vi.fn();
    const data = projectCanvasShellNodes([node('model', { pluginKind: 'dvt:transform' })], {
      ...projection,
      modelIds: new Set(['model']),
      openModel,
      projectSample: () => ({ canOpen: true, onOpen: preview }),
    })[0]!.data as DbtNodeData;
    expect(data.onOpenSourceDataSample).toBe(preview);
    expect(data.dataActionLabel).toBe('Preview');
    expect(preview).not.toHaveBeenCalled();
    data.onOpenNode?.('model');
    expect(openModel).toHaveBeenCalledExactlyOnceWith('model');
  });

  it('projects current run evidence only onto participating nodes without mutating the source', () => {
    const participant = node('in-run', { runStatusByNodeId: new Map([['in-run', 'completed']]) });
    const outside = node('outside');
    const result = projectCanvasShellNodes([participant, outside], {
      ...projection,
      runSnapshot: {
        runId: 'run-1',
        status: 'completed',
        completedAt: '2026-08-18T10:00:01.500Z',
        durationMs: 1500,
      },
    });
    expect(result[0]!.data).toMatchObject({
      lastRunAt: '2026-08-18T10:00:01.500Z',
      durationMs: 1500,
    });
    expect(result[1]!.data.lastRunAt).toBeUndefined();
    expect(result[1]!.data.durationMs).toBeUndefined();
    expect(participant.data.lastRunAt).toBeUndefined();
    expect(result[0]!.position).toBe(participant.position);
  });
});
