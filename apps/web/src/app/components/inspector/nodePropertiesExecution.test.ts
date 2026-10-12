import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { readNodeLastExecution } from '../canvas/nodeLastExecution';
import { buildNodePropertiesReadModel } from './nodePropertiesReadModel';
import { buildCanvasNodePresentationCopy } from '../../views/canvas/canvasNodePresentationCopy';
import { resolveCanvasViewCopy } from '../../views/canvas/canvasCopyCatalog';

const node: CanonicalNode = {
  id: 'model',
  name: 'Model',
  kind: 'dvt:transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
};

describe('last execution in Properties', () => {
  it.each([
    ['en', {}, 'Last run', 'Not calculated'],
    ['es', {}, 'Última ejecución', 'No calculado'],
    ['en', { lastRunAt: '2026-09-26T10:00:00Z' }, 'Last run', '2026-09-26T10:00:00Z'],
    ['es', { lastRunMinutesAgo: 1500 }, 'Última ejecución', '1.5k min'],
  ] as const)(
    'projects recorded execution without a card dependency: %s %o',
    (locale, metadata, label, value) => {
      const model = buildNodePropertiesReadModel({
        node: { ...node, metadata },
        nodes: [],
        edges: [],
        presentationCopy: buildCanvasNodePresentationCopy(resolveCanvasViewCopy(locale), locale),
      });
      expect(model.sections.find((section) => section.id === 'general')?.rows).toContainEqual({
        id: 'last-run',
        label,
        value,
      });
    }
  );

  it('does not claim model execution for a Source', () => {
    const model = buildNodePropertiesReadModel({
      node: { ...node, kind: 'dvt:source', role: 'input' },
      nodes: [],
      edges: [],
    });
    expect(model.sections.flatMap((section) => section.rows).map((row) => row.id)).not.toContain(
      'last-run'
    );
  });

  it('ignores malformed evidence and preserves recorded age precedence', () => {
    expect(readNodeLastExecution({ lastRunMinutesAgo: NaN, lastRunAt: ' ' })).toBeNull();
    expect(readNodeLastExecution({ lastRunAt: 'old' }, { lastRunMinutesAgo: 0 })).toEqual({
      kind: 'age',
      minutes: 0,
    });
    expect(readNodeLastExecution({}, { lastRunAt: ' current ' })).toEqual({
      kind: 'timestamp',
      at: 'current',
    });
  });
});
