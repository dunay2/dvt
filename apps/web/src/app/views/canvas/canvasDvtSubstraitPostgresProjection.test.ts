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
  projectDvtSubstraitPilotWindowToPostgresSql,
  projectDvtSubstraitInnerJoinToPostgresSql,
  projectDvtSubstraitPilotToPostgresSql,
} from './canvasDvtSubstraitPostgresProjection';
import { applyDvtSubstraitPilotAggregation } from './canvasDvtSubstraitAggregation';
import { applyDvtSubstraitPilotRowNumber } from './canvasDvtSubstraitWindow';
import {
  applyDvtSubstraitInnerJoinFieldEdit,
  createDvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';

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
});
