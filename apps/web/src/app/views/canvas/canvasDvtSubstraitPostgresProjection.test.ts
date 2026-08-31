import { describe, expect, it } from 'vitest';

import {
  applyDvtSubstraitPilotFunction,
  createDvtSubstraitPilotDraft,
  renameDvtSubstraitPilotOutput,
  type DvtSubstraitPilotDraft,
} from './canvasDvtSubstraitPilot';
import {
  DvtSubstraitPostgresProjectionError,
  projectDvtSubstraitPilotToPostgresSql,
} from './canvasDvtSubstraitPostgresProjection';

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
});
