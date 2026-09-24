import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import {
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  connectedOrdersProjectionDraft,
  connectedEventsProjectionDraft,
} from './canvasProjectionCommand.test-support';

describe('UTC year authoring', () => {
  it('derives a canonical UTC year from a timestamptz output', async () => {
    const functions = resolveDvtSubstraitColumnFunctions({
      dataType: 'timestamp with time zone',
      provider: 'postgres',
    });
    const extractYearUtc = functions.find((item) => item.name === 'extract year (UTC)');
    expect(extractYearUtc).toMatchObject({
      category: 'date-time',
      minimumArgumentCount: 1,
      maximumArgumentCount: 1,
    });
    if (extractYearUtc == null) throw new Error('Expected admitted UTC year extraction.');

    const base = connectedEventsProjectionDraft();
    const derived = createDvtSubstraitProjectionOutput(
      base,
      {
        alias: 'occurred_year',
        expression: {
          kind: 'scalar-function',
          capabilityId: extractYearUtc.capabilityId,
          operandFieldIds: ['output:occurred_at'],
        },
      },
      { inputDataTypes: ['timestamp with time zone'], provider: 'postgres' }
    );

    expect(derived.outcome).toBe('applied');
    if (derived.outcome !== 'applied') throw new Error('Expected temporal derivation.');
    const inspection = inspectDvtSubstraitProjectionDraft(derived.draft);
    expect(inspection).toMatchObject({
      ok: true,
      projection: {
        outputs: [
          { fieldId: 'output:occurred_at', dataType: 'timestamp with time zone' },
          { name: 'occurred_year', dataType: 'bigint' },
        ],
      },
    });
    const projected = await projectSubstraitToPostgresSql(derived.draft);
    expect(projected.projection.outputs.at(-1)).toMatchObject({ dataType: 'i64', nullable: true });
    const root = derived.draft.plan.relations[0]?.relType;
    const project = root?.case === 'root' ? root.value.input?.relType : undefined;
    const expression = project?.case === 'project' ? project.value.expressions.at(-1) : undefined;
    if (expression?.rexType.case !== 'scalarFunction') {
      throw new Error('Expected the temporal scalar expression.');
    }
    expression.rexType.value.arguments[0]!.argType = { case: 'enum', value: 'MONTH' };
    expect(inspectDvtSubstraitProjectionDraft(derived.draft)).toEqual({ ok: false });
    expect(
      resolveDvtSubstraitColumnFunctions({
        dataType: 'timestamp with time zone',
        provider: 'duckdb',
      })
    ).toEqual([]);
  });
  it('derives the advertised UTC year from a timestamp literal output', async () => {
    const extractYearUtc = resolveDvtSubstraitColumnFunctions({
      dataType: 'timestamp with time zone',
      provider: 'postgres',
    }).find((item) => item.name === 'extract year (UTC)');
    if (extractYearUtc == null) throw new Error('Expected admitted UTC year extraction.');

    const literal = createDvtSubstraitProjectionOutput(connectedOrdersProjectionDraft(), {
      alias: 'loaded_at',
      expression: { kind: 'timestamp-literal', value: '2026-09-02T12:30:00.000Z' },
    });
    if (literal.outcome !== 'applied') throw new Error('Expected timestamp literal output.');
    const derived = createDvtSubstraitProjectionOutput(
      literal.draft,
      {
        alias: 'loaded_year',
        expression: {
          kind: 'scalar-function',
          capabilityId: extractYearUtc.capabilityId,
          operandFieldIds: [literal.createdFieldId],
        },
      },
      { inputDataTypes: ['timestamp with time zone'], provider: 'postgres' }
    );

    expect(derived.outcome).toBe('applied');
    if (derived.outcome !== 'applied') throw new Error('Expected temporal literal derivation.');
    const projected = await projectSubstraitToPostgresSql(derived.draft);
    expect(projected.projection.outputs.at(-1)).toMatchObject({ dataType: 'i64', nullable: true });
  });
});
