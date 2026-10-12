/**
 * Owned concern: prove duplication isolates authoring identities without changing canonical meaning.
 * @baseline ADR-0064: the Plan owns semantics and the V1 sidecar owns stable identities.
 * @decision Copy real grouped commands and reload through the canonical document boundary.
 * @consequence A copied Transform cannot retain ownership or lineage from the original group.
 * @version 1.0.0
 */
import { indexSubstraitRelations, readSubstraitAuthoringGroup } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import {
  buildDuplicateNodeCommand,
  resolveCanvasNodeDuplicateTransaction,
} from './canvasDuplicateNodeCommand';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

describe('canvasDuplicateNodeCommand', () => {
  it('roundtrips a copied dependency group with independent ownership and operand identities', async () => {
    const session = new CanvasRelationAnalysisSession('duplicate-group');
    session.receive(connectedNamesProjectionDraft());
    try {
      await applySelectedRelationDerivedOutput(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'edit',
        alias: 'full_name',
        formula: 'CONCAT("first_name", "last_name")',
      });
      const document = await applySelectedRelationDerivedOutput(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'edit',
        alias: 'upper_name',
        formula: 'UPPER("full_name")',
      });
      const original = applyDvtSubstraitSemanticDocument(
        {
          id: 'transform-people',
          name: 'Names',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
        encodeDvtSubstraitSemanticDocument(document)
      );
      const before = readDvtTransformAuthoringAuthority(original)!.semanticDocument;
      const duplicate = buildDuplicateNodeCommand({
        sourceNode: { id: original.id, position: { x: 0, y: 0 } },
        sourceCanonicalNode: original,
        existingNodes: [],
      }).canonicalNode;
      const copied = readDvtTransformAuthoringAuthority(duplicate)!.semanticDocument;
      const indexed = indexSubstraitRelations(
        decodeDvtSubstraitSemanticDocument(JSON.parse(JSON.stringify(copied)))
      );
      if (!indexed.ok) throw indexed.error;
      const group = readSubstraitAuthoringGroup(indexed.index, indexed.index.rootId)!;
      expect(group.members).toHaveLength(3);
      expect(group.root.binding.authoringOwnerRelationId).toBeUndefined();
      const relationIds = new Map(
        before.sidecar.relations.map((binding, ordinal) => [
          binding.relationId,
          copied.sidecar.relations[ordinal]!.relationId,
        ])
      );
      const fieldIds = new Map(
        before.sidecar.fields.map((binding, ordinal) => [
          binding.fieldId,
          copied.sidecar.fields[ordinal]!.fieldId,
        ])
      );
      expect([...relationIds.values()].some((id) => relationIds.has(id))).toBe(false);
      expect([...fieldIds.values()].some((id) => fieldIds.has(id))).toBe(false);
      for (const member of group.members.slice(0, -1)) {
        expect(member.binding.authoringOwnerRelationId).toBe(group.root.binding.relationId);
      }
      expect(before.sidecar.fields.some((field) => (field.operandFieldIds?.length ?? 0) > 1)).toBe(
        true
      );
      for (const [ordinal, field] of before.sidecar.fields.entries()) {
        const copy = copied.sidecar.fields[ordinal]!;
        expect(copy.relationId).toBe(relationIds.get(field.relationId));
        expect(copy.sourceFieldId).toBe(
          field.sourceFieldId == null ? undefined : fieldIds.get(field.sourceFieldId)
        );
        expect(copy.operandFieldIds).toEqual(field.operandFieldIds?.map((id) => fieldIds.get(id)));
      }
      expect(copied.semanticPlan).toEqual(before.semanticPlan);
      expect(copied.sidecar.relations.map((binding) => binding.sourceRef)).toEqual(
        before.sidecar.relations.map((binding) => binding.sourceRef)
      );
      expect(readDvtTransformAuthoringAuthority(original)!.semanticDocument).toEqual(before);
    } finally {
      session.dispose();
    }
  });

  it('rejects malformed semantic authority before admitting a duplicate', () => {
    const sourceCanonicalNode = {
      id: 'broken-transform',
      name: 'Broken',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { transformAuthoring: { version: 'invalid' } },
    } as const;
    expect(
      resolveCanvasNodeDuplicateTransaction({
        nodeId: sourceCanonicalNode.id,
        sourceCanonicalNode: { ...sourceCanonicalNode, tags: [] },
        existingNodes: [{ id: sourceCanonicalNode.id, position: { x: 0, y: 0 } }],
        visibleNodeIds: [sourceCanonicalNode.id],
      })
    ).toEqual({ outcome: 'noop', reason: 'invalid_semantic_authority' });
  });
  it('builds a new node identity, resets runtime status, and displaces position', () => {
    const duplicate = buildDuplicateNodeCommand({
      sourceNode: {
        id: 'source-node',
        position: { x: 40, y: 80 },
        data: {},
      },
      sourceCanonicalNode: {
        id: 'source-node',
        name: 'Orders source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: ['authoring', 'critical'],
        path: 'models/orders.sql',
        description: 'Primary source node',
        metadata: {
          config: {
            schema: 'raw',
            table: 'orders',
          },
        },
        lastDuration: 320,
        lastCost: 18,
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {},
        },
        {
          id: 'source-node-copy-1',
          position: { x: 88, y: 128 },
          data: {},
        },
      ],
    });

    expect(duplicate).toEqual({
      canonicalNode: {
        id: 'source-node-copy-2',
        name: 'Orders source (copy 2)',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: ['authoring', 'critical'],
        path: 'models/orders.sql',
        description: 'Primary source node',
        metadata: {
          config: {
            schema: 'raw',
            table: 'orders',
          },
        },
      },
      position: {
        x: 136,
        y: 176,
      },
    });
  });

  it('does not crash duplicate commands when plugin metadata contains non-cloneable fields', () => {
    const duplicate = buildDuplicateNodeCommand({
      sourceNode: {
        id: 'source-node',
        position: { x: 40, y: 80 },
        data: {},
      },
      sourceCanonicalNode: {
        id: 'source-node',
        name: 'Orders source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: [],
        metadata: {
          config: {
            schema: 'raw',
          },
          onInspect: () => 'not serializable',
        },
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {},
        },
      ],
    });

    expect(duplicate.canonicalNode.metadata).toEqual({
      config: {
        schema: 'raw',
      },
    });
  });

  it('drops circular metadata links from duplicate commands while preserving JSON-like metadata', () => {
    const metadata: Record<string, unknown> = {
      config: {
        schema: 'raw',
      },
    };
    metadata.self = metadata;

    const duplicate = buildDuplicateNodeCommand({
      sourceNode: {
        id: 'source-node',
        position: { x: 40, y: 80 },
        data: {},
      },
      sourceCanonicalNode: {
        id: 'source-node',
        name: 'Orders source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: [],
        metadata,
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {},
        },
      ],
    });

    expect(duplicate.canonicalNode.metadata).toEqual({
      config: {
        schema: 'raw',
      },
    });
  });

  it('resolves duplicate graph fallout as a pure transaction', () => {
    const transaction = resolveCanvasNodeDuplicateTransaction({
      nodeId: 'source-node',
      sourceCanonicalNode: {
        id: 'source-node',
        name: 'Orders source',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'success',
        tags: [],
      },
      existingNodes: [
        {
          id: 'source-node',
          position: { x: 40, y: 80 },
          data: {
            role: 'input',
          },
        },
      ],
      visibleNodeIds: ['source-node'],
    });

    expect(transaction).toEqual({
      outcome: 'added',
      canonicalNode: expect.objectContaining({
        id: 'source-node-copy-1',
        name: 'Orders source (copy 1)',
      }),
      position: { x: 88, y: 128 },
    });
  });
});
