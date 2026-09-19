import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  applyDvtSubstraitFilter,
  encodeDvtSubstraitFilterDocument,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitProjectionDraft,
  createDvtSubstraitProjectionDraftFromTransform,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import {
  createDvtSubstraitUnionDistinctDraft,
  encodeDvtSubstraitUnionAllDocument,
} from './canvasDvtSubstraitSetComposition';

const SOURCE: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    },
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};

const TRANSFORM: CanonicalNode = {
  id: 'transform-orders',
  name: 'Orders Transform',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
};

const EDGE: CanonicalEdge = {
  id: 'source-transform',
  sourceId: SOURCE.id,
  targetId: TRANSFORM.id,
  relation: 'lineage',
};

function buildCanonicalTransform(): CanonicalNode {
  const source = resolveDvtSubstraitProjectionSource(SOURCE);
  if (source == null) throw new Error('Expected a connected PostgreSQL source fixture.');
  return applyDvtSubstraitSemanticDocument(
    TRANSFORM,
    encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: TRANSFORM.id,
        outputs: [
          { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
          { fieldId: 'output:customer', name: 'customer_name', sourceFieldName: 'customer' },
        ],
      })
    )
  );
}

describe('DVT Substrait output projection', () => {
  it.each([false, true])(
    'preserves calculated inputs through B and C (literal: %s)',
    async (withLiteral) => {
      const source = resolveDvtSubstraitProjectionSource(SOURCE)!;
      let draft = createDvtSubstraitProjectionDraft({
        source,
        targetNodeId: TRANSFORM.id,
        outputs: [{ fieldId: 'customer', name: 'customer', sourceFieldName: 'customer' }],
      });
      for (const [name, operands] of [
        ['upper', ['customer']],
        ['concat', ['customer', 'upper']],
      ] as const) {
        const inspection = inspectDvtSubstraitProjectionDraft(draft);
        if (!inspection.ok) throw new Error('Expected admitted calculation input.');
        const capability = resolveDvtSubstraitColumnFunctions({
          dataTypes: operands.map(() => 'text'),
          provider: 'postgres',
        }).find((entry) => entry.name === name)!;
        const result = createDvtSubstraitProjectionOutput(
          draft,
          {
            alias: name,
            expression: {
              kind: 'scalar-function',
              capabilityId: capability.capabilityId,
              operandFieldIds: [
                inspection.projection.outputs.find((output) => output.name === operands[0])!
                  .fieldId,
                ...operands
                  .slice(1)
                  .map(
                    (operand) =>
                      inspection.projection.outputs.find((output) => output.name === operand)!
                        .fieldId
                  ),
              ],
            },
          },
          { inputDataTypes: operands.map(() => 'text'), provider: 'postgres' }
        );
        if (result.outcome !== 'applied') throw new Error('Expected admitted calculation.');
        draft = result.draft;
      }
      if (withLiteral) {
        const literal = createDvtSubstraitProjectionOutput(draft, {
          alias: 'channel',
          expression: { kind: 'string-literal', value: "web's" },
        });
        if (literal.outcome !== 'applied') throw new Error('Expected admitted literal.');
        draft = literal.draft;
      }
      let upstream = applyDvtSubstraitSemanticDocument(
        TRANSFORM,
        encodeDvtSubstraitProjectionDocument(draft)
      );
      const nodes = [SOURCE, upstream];
      const edges = [EDGE];
      let expected = `SELECT customer, upper(customer) AS upper, customer || upper(customer) AS concat${withLiteral ? ", 'web''s' AS channel" : ''} FROM raw.orders`;
      for (const level of ['B', 'C']) {
        const inspection = inspectDvtSubstraitProjectionDraft(draft);
        if (!inspection.ok) throw new Error('Expected admitted upstream projection.');
        const selected = inspection.projection.outputs
          .filter((output) => output.name !== 'customer')
          .reverse();
        const target = { ...TRANSFORM, id: `transform-${level}` };
        draft = createDvtSubstraitProjectionDraftFromTransform({
          source: draft,
          targetNodeId: target.id,
          outputs: selected.map((output, ordinal) => ({
            fieldId: `${level}:${ordinal}`,
            name: `${level} ${ordinal}`,
            sourceFieldId: output.fieldId,
          })),
        });
        // The query consumes a serialized/reopened canonical document, not a separate SQL model.
        const document = encodeDvtSubstraitProjectionDocument(draft);
        draft = decodeDvtSubstraitProjectionDocument(document);
        const transform = applyDvtSubstraitSemanticDocument(target, document);
        edges.push({ ...EDGE, id: `${level}-edge`, sourceId: upstream.id, targetId: target.id });
        nodes.push(transform);
        const before = JSON.stringify(nodes);
        expected = `SELECT ${selected.map((output, ordinal) => `${output.name.includes(' ') ? `"${output.name}"` : output.name} AS "${level} ${ordinal}"`).join(', ')} FROM ( ${expected} ) AS projection_input`;
        const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
          transformNode: transform,
          nodes,
          edges,
        });
        expect(sql.replaceAll(/\s+/g, ' ').replace(/;$/, '').trim()).toBe(expected);
        expect(JSON.stringify(nodes)).toBe(before);
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes,
            edges: edges.slice(0, -1),
          })
        ).rejects.toThrow('source identities do not match');
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes: nodes.map((node) =>
              node.id === upstream.id ? { ...node, metadata: {} } : node
            ),
            edges,
          })
        ).rejects.toThrow('source identities do not match');
        await expect(
          projectDvtSubstraitTransformOutputToPostgresSql({
            transformNode: transform,
            nodes: nodes.map((node) =>
              node.id === upstream.id ? { ...buildCanonicalTransform(), id: upstream.id } : node
            ),
            edges,
          })
        ).rejects.toThrow('source identities do not match');
        upstream = transform;
      }
    }
  );

  it('projects PostgreSQL SQL from the exact connected canonical revision', async () => {
    const transform = buildCanonicalTransform();

    const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
      transformNode: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
    });

    expect(sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select order_id, customer as customer_name from raw\.orders;?$/
    );
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
    const capability = resolveDvtSubstraitFilterCapabilities({
      dataType: 'text',
      provider: 'postgres',
    })[0];
    if (source == null || capability == null) throw new Error('Expected admitted filter fixtures.');
    const filtered = applyDvtSubstraitFilter(
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
      encodeDvtSubstraitFilterDocument(filtered)
    );

    const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
      transformNode: transform,
      nodes: [SOURCE, transform],
      edges: [EDGE],
    });
    expect(sql.replaceAll(/\s+/g, ' ')).toMatch(/where customer = 'Ada'/i);
  });

  it('projects connected UNION DISTINCT authority as PostgreSQL UNION', async () => {
    const setSource = (id: string): CanonicalNode => ({
      ...SOURCE,
      id,
      name: id,
      metadata: {
        ...SOURCE.metadata,
        tableName: id,
        columns: [{ name: 'customer_id', type: 'string' }],
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: `raw.${id}`,
        },
      },
    });
    const north = setSource('customers_north');
    const south = setSource('customers_south');
    const draft = createDvtSubstraitUnionDistinctDraft({
      inputs: [north, south].map((source) => ({
        nodeId: source.id,
        schema: 'raw',
        table: source.id,
        fields: [{ name: 'customer_id', type: 'string' as const }],
        sourceRef: source.metadata?.connectedSourceRef as ConnectedSourceRef,
      })),
      targetNodeId: TRANSFORM.id,
    });
    const transform = applyDvtSubstraitSemanticDocument(
      TRANSFORM,
      encodeDvtSubstraitUnionAllDocument(draft)
    );
    const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
      transformNode: transform,
      nodes: [north, south, transform],
      edges: [
        { ...EDGE, id: 'north-transform', sourceId: north.id },
        { ...EDGE, id: 'south-transform', sourceId: south.id },
      ],
    });

    expect(sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select customer_id from raw\.customers_north union select customer_id from raw\.customers_south;?$/
    );
  });
});
