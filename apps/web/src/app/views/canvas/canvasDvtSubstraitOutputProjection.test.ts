import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { filterProjectionInputFixture } from './canvasFilterProjection.test-support';
import { describe } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import { resolveDvtSubstraitFilterCapabilities } from './canvasFilterCapabilities';

import { createDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitProjectionSource } from './canvasDvtSubstraitProjection';
import {
  SOURCE,
  TRANSFORM,
  EDGE,
  buildCanonicalTransform,
} from './canvasOutputProjection.test-support';

describe('Canonical output projection', () => {
  it('projects PostgreSQL SQL from the exact connected canonical revision', async () => {
    const transform = buildCanonicalTransform();

    const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
      transformNode: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
    });

    expect(sql.length).toBeGreaterThan(0);
    const bound = resolveCanvasSubstraitGraphBindings({
      node: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
    });
    expect(
      bound.index.relations.get(bound.index.rootId)!.fields.map((field) => field.fieldId)
    ).toEqual(['output:order_id', 'output:customer']);
  });
  it('fails closed when the connected source no longer matches the canonical sidecar', async () => {
    const transform = buildCanonicalTransform();

    await expect(
      projectDvtSubstraitTransformOutputToPostgresSql({
        transformNode: transform,
        nodes: [
          {
            ...SOURCE,
            metadata: { ...SOURCE.metadata, tableName: 'other_orders' },
          },
          transform,
        ],
        edges: [EDGE],
      })
    ).rejects.toThrow('source identities do not match');
  });
  it('projects a connected FilterRel from the exact canonical revision', async () => {
    const source = resolveDvtSubstraitProjectionSource(SOURCE);
    const capability = resolveDvtSubstraitFilterCapabilities({ dataType: 'text' })[0];
    if (source == null || capability == null) throw new Error('Expected admitted filter fixtures.');
    const filtered = await filterProjectionInputFixture(
      createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: TRANSFORM.id,
        outputs: [
          { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
          { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
        ],
      }),
      {
        fieldId: 'output:customer',
        dataType: 'text',
        capabilityId: capability.capabilityId,
        value: 'Ada',
      }
    );
    const transform = applyDvtSubstraitSemanticDocument(
      TRANSFORM,
      encodeDvtSubstraitSemanticDocument(filtered)
    );

    const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
      transformNode: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
    });
    expect(sql.length).toBeGreaterThan(0);
    const bound = resolveCanvasSubstraitGraphBindings({
      node: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
    });
    expect(
      [...bound.index.relations.values()].filter(
        (entry) => entry.relation.relType.case === 'filter'
      )
    ).toHaveLength(1);
  });
});
