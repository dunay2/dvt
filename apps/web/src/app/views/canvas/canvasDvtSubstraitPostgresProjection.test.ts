import { describe, expect, it } from 'vitest';

import {
  applyDvtSubstraitPilotFunction,
  createDvtSubstraitPilotDraft,
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
  projectDvtSubstraitUnionAllToPostgresSql,
} from './canvasDvtSubstraitPostgresProjection';
import { applyDvtSubstraitPilotAggregation } from './canvasDvtSubstraitAggregation';
import { applyDvtSubstraitPilotAggregateRowNumber } from './canvasDvtSubstraitAggregateWindow';
import { applyDvtSubstraitPilotRowNumber } from './canvasDvtSubstraitWindow';
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

function completedPilotDraft(): DvtSubstraitPilotDraft {
  let draft = createDvtSubstraitPilotDraft({
    sourceNodeId: 'source-customers',
    targetNodeId: 'transform-customers',
  });
  draft = applyDvtSubstraitPilotFunction(draft, 'trim');
  draft = applyDvtSubstraitPilotFunction(draft, 'upper');
  return renameDvtSubstraitPilotOutput(draft, 'customer_name');
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
    const draft = applyDvtSubstraitPilotAggregation(
      createDvtSubstraitPilotDraft({
        sourceNodeId: 'source-customers',
        targetNodeId: 'transform-customers',
      }),
      { groupFieldId: 'field:transform-customers:country', countOutputName: 'customer_count' }
    );

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
    const draft = applyDvtSubstraitPilotRowNumber(completedPilotDraft(), {
      partitionFieldId: 'field:transform-customers:country',
      orderFieldId: 'field:transform-customers:name',
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
    const grouped = applyDvtSubstraitPilotAggregation(
      createDvtSubstraitPilotDraft({
        sourceNodeId: 'source-customers',
        targetNodeId: 'transform-customers',
      }),
      { groupFieldId: 'field:transform-customers:country', countOutputName: 'customer_count' }
    );
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
      ],
      targetNodeId: 'transform-all-customers',
    });

    const sql = await projectDvtSubstraitUnionAllToPostgresSql(draft);
    const normalized = sql.replaceAll(/\s+/g, ' ').trim().toLowerCase();

    expect(normalized).toMatch(
      /^select customer_id, name, country from "tenant-data"\."customers-north" union all select customer_id, name, country from "tenant-data"\."customers-south";?$/
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
