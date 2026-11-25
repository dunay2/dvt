import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  isEmptyCanvasModelDefinition,
  canRemoveEmptyCanvasModel,
} from './canvasEmptyModelDefinition';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { projectionScenario } from './canvasProjectionScenario.test-support';
import { createProducerInput } from '@dvt/substrait-analysis';
import { createSourceDocument } from './canvasSourceDocument';

function emptyModel(id = 'empty'): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: { typeLabel: 'Model' },
  };
}

function sessionWith(nodes: CanonicalNode[]): CanvasDraftSession {
  const draft = buildCanvasAuthoringDraft({
    canvas: { id: 'main', kind: 'transformation', title: 'Main' },
    nodeIds: [],
    nodePositions: {},
    visibleEdges: [],
    canonicalNodes: nodes,
    canonicalEdges: [],
  });
  return canvasDraftSession.machine.bootstrap({
    remoteDraft: { revision: 'rev-1', savedAt: '2026-11-25T00:00:00Z', draft },
    canonicalNodeIds: nodes.map((node) => node.id),
    canonicalEdges: [],
  });
}

describe('empty Model definition removal policy', () => {
  it('recognizes a native type-label-only draft and empty default config', () => {
    expect(isEmptyCanvasModelDefinition(emptyModel())).toBe(true);
    expect(
      isEmptyCanvasModelDefinition({
        ...emptyModel(),
        metadata: { typeLabel: 'Modelo', config: {} },
      })
    ).toBe(true);
    expect(canRemoveEmptyCanvasModel(sessionWith([emptyModel()]), 'empty')).toBe(true);
  });

  it.each([
    { path: 'models/model.sql' },
    { definitionId: 'other' },
    { metadata: { transformAuthoring: { mode: 'substrait' } } },
    { metadata: { sql: 'select 1' } },
    { metadata: { config: { relation: {} } } },
    { metadata: { unknownAuthority: true } },
    { description: 'Revenue reconciliation model' },
    { tags: ['finance'] },
    { lastDuration: 125 },
    { kind: 'dbt:model' as const, pluginId: 'dbt' },
  ])('preserves authored, file-owned, referenced or unknown definitions: %j', (changes) => {
    expect(isEmptyCanvasModelDefinition({ ...emptyModel(), ...changes })).toBe(false);
  });

  it('preserves another visible occurrence and both edge directions', () => {
    const occurrence = { ...emptyModel('copy'), definitionId: 'empty' };
    const session = {
      ...sessionWith([emptyModel(), occurrence]),
      localNodeCatalog: { copy: occurrence },
    };
    expect(
      canRemoveEmptyCanvasModel(
        { ...session, workingSet: { ...session.workingSet, visibleNodeIds: ['copy'] } },
        'empty'
      )
    ).toBe(false);
    for (const edge of [
      { sourceId: 'empty', targetId: 'other' },
      { sourceId: 'other', targetId: 'empty' },
    ]) {
      expect(canRemoveEmptyCanvasModel({ ...session, localDefinitionEdges: [edge] }, 'empty')).toBe(
        false
      );
    }
  });

  it('preserves the definition when an inactive Canvas owns it', () => {
    const session = sessionWith([emptyModel()]);
    const record = session.baseline.record!;
    const sibling = {
      ...record.draft,
      canvas: { id: 'sibling', kind: 'transformation', title: 'Sibling' },
    };
    const baseline = { record: { ...record, draft: { ...record.draft, canvases: [sibling] } } };
    expect(canRemoveEmptyCanvasModel({ ...session, baseline }, 'empty')).toBe(false);
    expect(session.baseline.record).toBe(record);
  });

  it('fails closed when another native model has unreadable semantic authority', () => {
    const consumer = {
      ...emptyModel('consumer'),
      metadata: { transformAuthoring: { mode: 'substrait' } },
    };
    expect(canRemoveEmptyCanvasModel(sessionWith([emptyModel(), consumer]), 'empty')).toBe(false);
  });

  it('preserves a canonical producer referenced by a valid consumer without a visible edge', () => {
    const published = projectionScenario({ sourceNodeId: 'source', targetNodeId: 'empty' });
    const read = createProducerInput({ nodeId: 'empty', name: 'Empty', document: published }, 1);
    const consumer = applyDvtSubstraitSemanticDocument(
      emptyModel('consumer'),
      encodeDvtSubstraitSemanticDocument(createSourceDocument([read], read))
    );
    expect(canRemoveEmptyCanvasModel(sessionWith([emptyModel(), consumer]), 'empty')).toBe(false);
    expect(isEmptyCanvasModelDefinition(consumer)).toBe(false);
  });
});
