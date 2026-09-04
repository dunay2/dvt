import { create } from '@bufbuild/protobuf';
import {
  FunctionOptionSchema,
  type Expression_ScalarFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import {
  applyDvtSubstraitPilotFunction,
  createDvtSubstraitPilotDraft,
  inspectDvtSubstraitPilotDraft,
  renameDvtSubstraitPilotOutput,
  type DvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  DvtSubstraitPostgresProjectionError,
  projectDvtSubstraitPilotAggregationToPostgresSql,
  projectDvtSubstraitPilotAggregateWindowToPostgresSql,
  projectDvtSubstraitPilotWindowToPostgresSql,
  projectDvtSubstraitInnerJoinToPostgresSql,
  projectDvtSubstraitPilotToPostgresSql,
  projectDvtSubstraitProjectionToPostgresSql,
  projectDvtSubstraitUnionAllToPostgresSql,
} from './canvasDvtSubstraitPostgresProjection';
import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { appendDvtSubstraitCalculatedColumn } from './canvasDvtSubstraitCalculatedColumn';
import { applyDvtSubstraitPilotAggregation } from './canvasDvtSubstraitAggregation';
import { applyDvtSubstraitPilotAggregateRowNumber } from './canvasDvtSubstraitAggregateWindow';
import { applyDvtSubstraitPilotRowNumber } from './canvasDvtSubstraitWindow';
import {
  applyDvtSubstraitFilter,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import {
  applyDvtSubstraitInnerJoinFieldEdit,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  applyDvtSubstraitInnerJoinGrouping,
  appendDvtSubstraitInnerJoinInput,
  createDvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitUnionAllGroupedRowNumber,
  applyDvtSubstraitUnionAllGrouping,
  applyDvtSubstraitUnionAllFieldEdit,
  createDvtSubstraitUnionAllDraft,
} from './canvasDvtSubstraitSetComposition';

function requirePilotOutputId(draft: DvtSubstraitPilotDraft, name: string): string {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok) throw new Error('Expected admitted pilot projection.');
  const output = inspection.projection.outputs.find((candidate) => candidate.name === name);
  if (output == null) throw new Error(`Expected pilot output ${name}.`);
  return output.fieldId;
}

function completedPilotDraft(): DvtSubstraitPilotDraft {
  let draft = createDvtSubstraitPilotDraft({
    sourceNodeId: 'source-customers',
    targetNodeId: 'transform-customers',
  });
  draft = applyDvtSubstraitPilotFunction(draft, 'trim');
  draft = applyDvtSubstraitPilotFunction(draft, 'upper');
  return renameDvtSubstraitPilotOutput(draft, 'customer_name');
}

function connectedOrdersProjectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-orders',
      schema: 'raw',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'raw.orders',
      },
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
        { name: 'amount', dataType: 'numeric' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'buyer', sourceFieldName: 'customer' },
      { fieldId: 'output:amount', name: 'amount', sourceFieldName: 'amount' },
    ],
  });
}

describe('VTX2 Substrait -> PostgreSQL projection', () => {
  it('renders the accepted typed pilot recipe through the PostgreSQL deparser', async () => {
    const sql = await projectDvtSubstraitPilotToPostgresSql(completedPilotDraft());
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^select upper\(trim\(name\)\) as customer_name, email, country from customers;?$/
    );
  });

  it('is deterministic for the same typed recipe', async () => {
    const draft = completedPilotDraft();

    await expect(projectDvtSubstraitPilotToPostgresSql(draft)).resolves.toBe(
      await projectDvtSubstraitPilotToPostgresSql(draft)
    );
  });

  it('renders connected-field Substrait as a derived PostgreSQL projection', async () => {
    const draft = connectedOrdersProjectionDraft();

    const sql = await projectDvtSubstraitProjectionToPostgresSql(draft);

    expect(sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select order_id, customer as buyer, amount from raw\.orders;?$/
    );
  });

  it('renders an admitted Source filter from the canonical FilterRel', async () => {
    const capability = resolveDvtSubstraitFilterCapabilities({
      dataType: 'text',
      provider: 'postgres',
    })[0];
    if (capability == null) throw new Error('Expected an admitted filter capability.');
    const draft = applyDvtSubstraitFilter(connectedOrdersProjectionDraft(), {
      fieldId: 'output:customer',
      dataType: 'text',
      capabilityId: capability.capabilityId,
      value: "O'Reilly",
    });

    const sql = await projectDvtSubstraitProjectionToPostgresSql(draft);

    expect(sql.replaceAll(/\s+/g, ' ').trim().toLowerCase()).toMatch(
      /^select order_id, customer as buyer, amount from raw\.orders where customer = 'o''reilly';?$/
    );
  });

  it('derives literals and ordered row numbers from the canonical projection', async () => {
    let draft = connectedOrdersProjectionDraft();
    draft = appendDvtSubstraitCalculatedColumn(draft, {
      kind: 'string-literal',
      alias: 'channel',
      value: 'web',
    });
    draft = appendDvtSubstraitCalculatedColumn(draft, {
      kind: 'timestamp-literal',
      alias: 'loaded_at',
      value: '2026-09-02T12:30:00Z',
    });
    draft = appendDvtSubstraitCalculatedColumn(draft, {
      kind: 'row-number',
      alias: 'row_id',
      orderFieldId: 'output:order_id',
    });

    const sql = (await projectDvtSubstraitProjectionToPostgresSql(draft))
      .replaceAll(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    expect(sql).toContain("'web' as channel");
    expect(sql).toContain("'2026-09-02t12:30:00.000z'::timestamptz as loaded_at");
    expect(sql).toMatch(/row_number\(\) over \(order by order_id asc nulls last\) as row_id/);
  });

  it('projects only admitted scalar functions compatible with the field type and target', () => {
    const textFunctions = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    });

    expect(textFunctions.map((item) => item.name)).toEqual(['lower', 'trim', 'upper']);
    expect(textFunctions.every((item) => item.category === 'text')).toBe(true);
    expect(textFunctions.every((item) => item.capabilityId.includes('scalar-function'))).toBe(true);
    expect(
      resolveDvtSubstraitColumnFunctions({ dataType: 'integer', provider: 'postgres' })
    ).toEqual([]);
    expect(
      resolveDvtSubstraitColumnFunctions({ dataType: 'numeric', provider: 'postgres' })
    ).toEqual([]);
    expect(resolveDvtSubstraitColumnFunctions({ dataType: 'text', provider: 'duckdb' })).toEqual(
      []
    );
  });

  it('stacks admitted functions on one canonical field and derives SQL from that revision', async () => {
    const functions = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    });
    const trim = functions.find((item) => item.name === 'trim');
    const upper = functions.find((item) => item.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted text functions.');

    const base = connectedOrdersProjectionDraft();
    const withTrim = applyDvtSubstraitProjectionFunction(base, {
      fieldId: 'output:customer',
      capabilityId: trim.capabilityId,
      alias: 'buyer',
      dataType: 'text',
      provider: 'postgres',
    });
    const withUpper = applyDvtSubstraitProjectionFunction(withTrim, {
      fieldId: 'output:customer',
      capabilityId: upper.capabilityId,
      alias: 'buyer',
      dataType: 'text',
      provider: 'postgres',
    });

    expect(withTrim).not.toBe(base);
    await expect(projectDvtSubstraitProjectionToPostgresSql(withUpper)).resolves.toMatch(
      /upper\(trim\(customer\)\) AS buyer/i
    );
    expect(
      applyDvtSubstraitProjectionFunction(base, {
        fieldId: 'output:amount',
        capabilityId: trim.capabilityId,
        alias: 'amount',
        dataType: 'numeric',
        provider: 'postgres',
      })
    ).toBe(base);
  });

  it('rejects scalar functions whose return type or behavioral options exceed the profile', () => {
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((item) => item.name === 'trim');
    if (trim == null) throw new Error('Expected admitted trim capability.');
    const applyTrim = (): DvtSubstraitProjectionDraft =>
      applyDvtSubstraitProjectionFunction(connectedOrdersProjectionDraft(), {
        fieldId: 'output:customer',
        capabilityId: trim.capabilityId,
        alias: 'buyer',
        dataType: 'text',
        provider: 'postgres',
      });
    const readScalarFunction = (draft: DvtSubstraitProjectionDraft): Expression_ScalarFunction => {
      const root = draft.plan.relations[0]?.relType;
      const project = root?.case === 'root' ? root.value.input?.relType : undefined;
      const expression = project?.case === 'project' ? project.value.expressions[0] : undefined;
      if (expression?.rexType.case !== 'scalarFunction') {
        throw new Error('Expected one scalar function expression.');
      }
      return expression.rexType.value;
    };

    const invalidReturnType = applyTrim();
    readScalarFunction(invalidReturnType).outputType = undefined;
    expect(inspectDvtSubstraitProjectionDraft(invalidReturnType)).toEqual({ ok: false });

    const unsupportedOptions = applyTrim();
    readScalarFunction(unsupportedOptions).options.push(
      create(FunctionOptionSchema, { name: 'unsupported', preference: ['enabled'] })
    );
    expect(inspectDvtSubstraitProjectionDraft(unsupportedOptions)).toEqual({ ok: false });
  });

  it('applies a function only to the selected output when expressions are shared', () => {
    const functions = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    });
    const trim = functions.find((item) => item.name === 'trim');
    const upper = functions.find((item) => item.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted text functions.');
    const withTrim = applyDvtSubstraitProjectionFunction(connectedOrdersProjectionDraft(), {
      fieldId: 'output:customer',
      capabilityId: trim.capabilityId,
      alias: 'buyer',
      dataType: 'text',
      provider: 'postgres',
    });
    const root = withTrim.plan.relations[0]?.relType;
    const project = root?.case === 'root' ? root.value.input?.relType : undefined;
    const emitKind = project?.case === 'project' ? project.value.common?.emitKind : undefined;
    if (emitKind?.case !== 'emit') throw new Error('Expected projection output mapping.');
    emitKind.value.outputMapping[2] = emitKind.value.outputMapping[1]!;
    expect(inspectDvtSubstraitProjectionDraft(withTrim).ok).toBe(true);

    const withUpper = applyDvtSubstraitProjectionFunction(withTrim, {
      fieldId: 'output:customer',
      capabilityId: upper.capabilityId,
      alias: 'buyer',
      dataType: 'text',
      provider: 'postgres',
    });
    const inspection = inspectDvtSubstraitProjectionDraft(withUpper);

    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[1]?.operations).toEqual(['trim', 'upper']);
    expect(inspection.projection.outputs[2]?.operations).toEqual(['trim']);
  });

  it('fails closed while the pilot recipe is incomplete', async () => {
    let draft = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    draft = applyDvtSubstraitPilotFunction(draft, 'trim');

    await expect(projectDvtSubstraitPilotToPostgresSql(draft)).rejects.toMatchObject({
      name: DvtSubstraitPostgresProjectionError.name,
      code: 'unsupported_shape',
    });
  });

  it('fails closed when the typed Substrait shape is not the admitted fixture', async () => {
    const draft = completedPilotDraft();
    const root = draft.plan.relations[0]?.relType;
    if (root?.case !== 'root') throw new Error('Expected pilot root relation.');
    root.value.names[1] = 'changed_email';

    await expect(projectDvtSubstraitPilotToPostgresSql(draft)).rejects.toMatchObject({
      code: 'unsupported_shape',
    });
  });

  it('fails closed when a physical source binding is incomplete', async () => {
    await expect(
      projectDvtSubstraitPilotToPostgresSql(completedPilotDraft(), {
        schema: ' ',
        table: 'customers',
      })
    ).rejects.toMatchObject({
      code: 'invalid_source_binding',
    });
  });

  it('projects one admitted Substrait grain field and row count', async () => {
    const base = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    const draft = applyDvtSubstraitPilotAggregation(base, {
      groupFieldId: requirePilotOutputId(base, 'country'),
      countOutputName: 'customer_count',
    });

    const sql = await projectDvtSubstraitPilotAggregationToPostgresSql(draft, {
      schema: 'public',
      table: 'customers',
    });
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^select country as country, count\(\*\) as customer_count from public\.customers group by country;?$/
    );
  });

  it('projects one admitted Substrait row_number partition and ordering', async () => {
    const base = completedPilotDraft();
    const draft = applyDvtSubstraitPilotRowNumber(base, {
      partitionFieldId: requirePilotOutputId(base, 'country'),
      orderFieldId: requirePilotOutputId(base, 'customer_name'),
      outputName: 'country_row_number',
    });

    const sql = await projectDvtSubstraitPilotWindowToPostgresSql(draft, {
      schema: 'public',
      table: 'customers',
    });
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^select upper\(trim\(name\)\) as customer_name, email, country, row_number\(\) over \( ?partition by country order by name asc nulls last ?\) as country_row_number from public\.customers;?$/
    );
  });

  it('projects grouped rows ranked globally by their count from one Substrait revision', async () => {
    const base = createDvtSubstraitPilotDraft({
      sourceNodeId: 'source-customers',
      targetNodeId: 'transform-customers',
    });
    const grouped = applyDvtSubstraitPilotAggregation(base, {
      groupFieldId: requirePilotOutputId(base, 'country'),
      countOutputName: 'customer_count',
    });
    const ranked = applyDvtSubstraitPilotAggregateRowNumber(grouped, {
      outputName: 'count_rank',
    });

    const sql = await projectDvtSubstraitPilotAggregateWindowToPostgresSql(ranked, {
      schema: 'public',
      table: 'customers',
    });
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^select country as country, count\(\*\) as customer_count, row_number\(\) over \( ?order by count\(\*\) desc nulls last, country asc nulls last ?\) as count_rank from public\.customers group by country;?$/
    );
  });

  it('projects the exact typed INNER JOIN from the canonical Substrait revision', async () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: 'source-customers',
        schema: 'tenant-data',
        table: 'customer-ledger',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'tenant-data.customer-ledger',
        },
      },
      right: {
        nodeId: 'source-orders',
        schema: 'tenant-data',
        table: 'order-ledger',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'tenant-data.order-ledger',
        },
      },
      targetNodeId: 'transform-customer-orders',
    });

    const sql = await projectDvtSubstraitInnerJoinToPostgresSql(draft);
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^select left_source\.customer_id as customer_id, left_source\.name as name, right_source\.order_id as order_id from "tenant-data"\."customer-ledger" as left_source join "tenant-data"\."order-ledger" as right_source on left_source\.customer_id = right_source\.customer_id;?$/
    );
  });

  it.each([
    {
      appendedSources: [{ nodeId: 'source-shipments', table: 'shipments', output: 'shipment_id' }],
      expectedSql:
        'select left_source.customer_id as customer_id, left_source.name as name, right_source.order_id as order_id, join_source_3.shipment_id as shipment_id from public.customers as left_source join public.orders as right_source on left_source.customer_id = right_source.customer_id join public.shipments as join_source_3 on left_source.customer_id = join_source_3.customer_id',
    },
    {
      appendedSources: [
        { nodeId: 'source-shipments', table: 'shipments', output: 'shipment_id' },
        { nodeId: 'source-tickets', table: 'tickets', output: 'ticket_id' },
      ],
      expectedSql:
        'select left_source.customer_id as customer_id, left_source.name as name, right_source.order_id as order_id, join_source_3.shipment_id as shipment_id, join_source_4.ticket_id as ticket_id from public.customers as left_source join public.orders as right_source on left_source.customer_id = right_source.customer_id join public.shipments as join_source_3 on left_source.customer_id = join_source_3.customer_id join public.tickets as join_source_4 on left_source.customer_id = join_source_4.customer_id',
    },
  ])(
    'projects $appendedSources.length appended inputs through one recursive path',
    async (fixture) => {
      const connectionRef = {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'warehouse-main',
        provider: 'postgres' as const,
      };
      let draft = createDvtSubstraitInnerJoinDraft({
        left: {
          nodeId: 'source-customers',
          schema: 'public',
          table: 'customers',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.customers',
          },
        },
        right: {
          nodeId: 'source-orders',
          schema: 'public',
          table: 'orders',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.orders',
          },
        },
        targetNodeId: 'transform-customer-orders',
      });
      for (const appended of fixture.appendedSources) {
        draft = appendDvtSubstraitInnerJoinInput(draft, {
          source: {
            nodeId: appended.nodeId,
            schema: 'public',
            table: appended.table,
            sourceRef: {
              schemaVersion: 'connected-source-ref.v1',
              connectionRef,
              sourceObjectId: `public.${appended.table}`,
            },
          },
          fields: [appended.output, 'customer_id'],
          predicate: {
            leftSourceFieldId: 'field:source-customers:customer_id',
            rightFieldName: 'customer_id',
          },
          selectedFields: [appended.output],
        });
      }

      const normalized = (await projectDvtSubstraitInnerJoinToPostgresSql(draft))
        .replaceAll(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      expect(normalized).toBe(fixture.expectedSql);
    }
  );

  it('projects grouping and ranking above the recursive N-input INNER JOIN', async () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    let draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: 'source-customers',
        schema: 'public',
        table: 'customers',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'public.customers',
        },
      },
      right: {
        nodeId: 'source-orders',
        schema: 'public',
        table: 'orders',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'public.orders',
        },
      },
      targetNodeId: 'transform-customer-orders',
    });
    draft = appendDvtSubstraitInnerJoinInput(draft, {
      source: {
        nodeId: 'source-shipments',
        schema: 'public',
        table: 'shipments',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'public.shipments',
        },
      },
      fields: ['shipment_id', 'customer_id'],
      predicate: {
        leftSourceFieldId: 'field:source-customers:customer_id',
        rightFieldName: 'customer_id',
      },
      selectedFields: ['shipment_id'],
    });
    draft = applyDvtSubstraitInnerJoinGrouping(draft, {
      groupFieldId: 'field:transform-customer-orders:shipment_id',
      countOutputName: 'shipment_count',
    });
    draft = applyDvtSubstraitInnerJoinGroupedRowNumber(draft, {
      outputName: 'shipment_rank',
    });

    const normalized = (await projectDvtSubstraitInnerJoinToPostgresSql(draft))
      .replaceAll(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    expect(normalized).toMatch(
      /^select shipment_id, count\(\*\) as shipment_count, row_number\(\) over \(order by count\(\*\) desc nulls last, shipment_id asc nulls last\) as shipment_rank from \(\s*select left_source\.customer_id as customer_id, left_source\.name as name, right_source\.order_id as order_id, join_source_3\.shipment_id as shipment_id from public\.customers as left_source join public\.orders as right_source on left_source\.customer_id = right_source\.customer_id join public\.shipments as join_source_3 on left_source\.customer_id = join_source_3\.customer_id\s*\) as inner_join_input group by shipment_id;?$/
    );
  });

  it('projects selected, renamed, and reordered fields from the same INNER JOIN revision', async () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    let draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: 'source-customers',
        schema: 'public',
        table: 'customers',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'public.customers',
        },
      },
      right: {
        nodeId: 'source-orders',
        schema: 'public',
        table: 'orders',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'public.orders',
        },
      },
      targetNodeId: 'transform-customer-orders',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'left.name',
      outputName: 'customer_name',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'move',
      fieldKey: 'right.order_id',
      direction: 'up',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'set-selected',
      fieldKey: 'left.customer_id',
      selected: false,
    });

    const sql = await projectDvtSubstraitInnerJoinToPostgresSql(draft);
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^select right_source\.order_id as order_id, left_source\.name as customer_name from public\.customers as left_source join public\.orders as right_source on left_source\.customer_id = right_source\.customer_id;?$/
    );
  });

  it('projects grouping and deterministic ranking over the selected INNER JOIN revision', async () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    let draft = createDvtSubstraitInnerJoinDraft({
      left: {
        nodeId: 'source-customers',
        schema: 'public',
        table: 'customers',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'public.customers',
        },
      },
      right: {
        nodeId: 'source-orders',
        schema: 'public',
        table: 'orders',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'public.orders',
        },
      },
      targetNodeId: 'transform-customer-orders',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'left.name',
      outputName: 'customer_name',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'move',
      fieldKey: 'left.name',
      direction: 'up',
    });
    draft = applyDvtSubstraitInnerJoinFieldEdit(draft, {
      kind: 'set-selected',
      fieldKey: 'left.customer_id',
      selected: false,
    });
    draft = applyDvtSubstraitInnerJoinGrouping(draft, {
      groupFieldId: 'field:transform-customer-orders:name',
      countOutputName: 'order_count',
    });
    draft = applyDvtSubstraitInnerJoinGroupedRowNumber(draft, {
      outputName: 'count_rank',
    });

    const normalized = (await projectDvtSubstraitInnerJoinToPostgresSql(draft))
      .replaceAll(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    expect(normalized).toMatch(
      /^select customer_name, count\(\*\) as order_count, row_number\(\) over \(order by count\(\*\) desc nulls last, customer_name asc nulls last\) as count_rank from \(\s*select left_source\.name as customer_name, right_source\.order_id as order_id from public\.customers as left_source join public\.orders as right_source on left_source\.customer_id = right_source\.customer_id\s*\) as inner_join_input group by customer_name;?$/
    );
  });

  it('projects the exact typed SetRel revision as PostgreSQL UNION ALL', async () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const fields = ['customer_id', 'name', 'country'].map((name) => ({
      name,
      type: 'string' as const,
    }));
    const draft = createDvtSubstraitUnionAllDraft({
      inputs: [
        {
          nodeId: 'source-customers-north',
          schema: 'tenant-data',
          table: 'customers-north',
          fields,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'tenant-data.customers-north',
          },
        },
        {
          nodeId: 'source-customers-south',
          schema: 'tenant-data',
          table: 'customers-south',
          fields,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'tenant-data.customers-south',
          },
        },
        {
          nodeId: 'source-customers-west',
          schema: 'tenant-data',
          table: 'customers-west',
          fields,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'tenant-data.customers-west',
          },
        },
      ],
      targetNodeId: 'transform-all-customers',
    });

    const sql = await projectDvtSubstraitUnionAllToPostgresSql(draft);
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^\(select customer_id, name, country from "tenant-data"\."customers-north" union all select customer_id, name, country from "tenant-data"\."customers-south"\) union all select customer_id, name, country from "tenant-data"\."customers-west";?$/
    );
  });

  it('projects selected, renamed, and reordered fields from the same SetRel revision', async () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const fields = ['customer_id', 'name', 'country'].map((name) => ({
      name,
      type: 'string' as const,
    }));
    let draft = createDvtSubstraitUnionAllDraft({
      inputs: [
        {
          nodeId: 'source-north',
          schema: 'public',
          table: 'customers_north',
          fields,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.customers_north',
          },
        },
        {
          nodeId: 'source-south',
          schema: 'public',
          table: 'customers_south',
          fields,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.customers_south',
          },
        },
      ],
      targetNodeId: 'transform-all-customers',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'move',
      fieldKey: 'country',
      direction: 'up',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'move',
      fieldKey: 'country',
      direction: 'up',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'set-selected',
      fieldKey: 'name',
      selected: false,
    });

    const normalized = (await projectDvtSubstraitUnionAllToPostgresSql(draft))
      .replaceAll(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    expect(normalized).toMatch(
      /^select country as region, customer_id from public\.customers_north union all select country as region, customer_id from public\.customers_south;?$/
    );
  });

  it('projects grouping and deterministic ranking over the selected UNION ALL revision', async () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const fields = ['customer_id', 'name', 'country'].map((name) => ({
      name,
      type: 'string' as const,
    }));
    let draft = createDvtSubstraitUnionAllDraft({
      inputs: [
        {
          nodeId: 'source-north',
          schema: 'public',
          table: 'customers_north',
          fields,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.customers_north',
          },
        },
        {
          nodeId: 'source-south',
          schema: 'public',
          table: 'customers_south',
          fields,
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'public.customers_south',
          },
        },
      ],
      targetNodeId: 'transform-all-customers',
    });
    draft = applyDvtSubstraitUnionAllFieldEdit(draft, {
      kind: 'rename',
      fieldKey: 'country',
      outputName: 'region',
    });
    draft = applyDvtSubstraitUnionAllGrouping(draft, {
      groupFieldId: 'field:transform-all-customers:country',
      countOutputName: 'customer_count',
    });
    draft = applyDvtSubstraitUnionAllGroupedRowNumber(draft, {
      outputName: 'count_rank',
    });

    const normalized = (await projectDvtSubstraitUnionAllToPostgresSql(draft))
      .replaceAll(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    expect(normalized).toMatch(
      /^select region, count\(\*\) as customer_count, row_number\(\) over \(order by count\(\*\) desc nulls last, region asc nulls last\) as count_rank from \(\s*select customer_id, name, country as region from public\.customers_north union all select customer_id, name, country as region from public\.customers_south\s*\) as union_all_input group by region;?$/
    );
  });
});
