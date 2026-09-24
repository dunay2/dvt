import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import {
  applyDvtSubstraitProjectionFunction,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  connectedOrdersProjectionDraft,
  connectedFallbackNamesProjectionDraft,
  createProjectionOutput,
} from './canvasProjectionCommand.test-support';

describe('Projection value authoring', () => {
  it('projects ordered variadic COALESCE operands through the governed PostgreSQL AST', async () => {
    const functions = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
      resolution: 'proposal',
    });
    const upper = functions.find((candidate) => candidate.name === 'upper');
    const coalesce = functions.find((candidate) => candidate.name === 'coalesce');
    if (upper == null || coalesce == null) {
      throw new Error('Expected admitted UPPER and COALESCE capabilities.');
    }

    const normalized = createDvtSubstraitProjectionOutput(
      connectedFallbackNamesProjectionDraft(),
      {
        alias: 'last_resort_normalized',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: ['output:last_resort_name'],
          capabilityId: upper.capabilityId,
        },
      },
      { inputDataTypes: ['text'], provider: 'postgres' }
    );
    if (normalized.outcome !== 'applied') throw new Error('Expected UPPER output creation.');
    const result = createDvtSubstraitProjectionOutput(
      normalized.draft,
      {
        alias: 'display_name',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: [
            'output:primary_name',
            'output:fallback_name',
            normalized.createdFieldId,
          ],
          capabilityId: coalesce.capabilityId,
        },
      },
      { inputDataTypes: ['text', 'text', 'text'], provider: 'postgres' }
    );
    if (result.outcome !== 'applied') throw new Error('Expected COALESCE output creation.');

    expect(
      result.draft.sidecar.fields.find((field) => field.fieldId === result.createdFieldId)
        ?.operandFieldIds
    ).toEqual(['output:primary_name', 'output:fallback_name', normalized.createdFieldId]);
    const projected = await projectSubstraitToPostgresSql(result.draft);
    expect(projected.projection.outputs.at(-1)).toMatchObject({
      name: 'display_name',
      dataType: 'string',
    });
  });
  it('derives literals and ordered row numbers from the canonical projection', async () => {
    let draft = connectedOrdersProjectionDraft();
    draft = createProjectionOutput(draft, {
      alias: 'channel',
      expression: { kind: 'string-literal', value: 'web' },
    });
    draft = createProjectionOutput(draft, {
      alias: 'loaded_at',
      expression: { kind: 'timestamp-literal', value: '2026-09-02T12:30:00.000Z' },
    });
    draft = createProjectionOutput(draft, {
      alias: 'row_id',
      expression: { kind: 'row-number', orderFieldId: 'output:order_id' },
    });

    const projected = await projectSubstraitToPostgresSql(draft);
    expect(projected.projection.outputs.slice(-3)).toMatchObject([
      { name: 'channel', dataType: 'string' },
      { name: 'loaded_at', dataType: 'precisionTimestampTz' },
      { name: 'row_id', dataType: 'i64', nullable: true },
    ]);
  });
  it('stacks admitted functions on one canonical field and derives SQL from that revision', async () => {
    const functions = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text'],
      provider: 'postgres',
    });
    const trim = functions.find((item) => item.name === 'trim');
    const upper = functions.find((item) => item.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted text functions.');

    const base = connectedOrdersProjectionDraft();
    const withTrim = applyDvtSubstraitProjectionFunction(base, {
      fieldId: 'output:customer',
      operandFieldIds: ['output:customer'],
      capabilityId: trim.capabilityId,
      alias: 'buyer',
      dataTypes: ['text'],
      provider: 'postgres',
    });
    const withUpper = applyDvtSubstraitProjectionFunction(withTrim, {
      fieldId: 'output:customer',
      operandFieldIds: ['output:customer'],
      capabilityId: upper.capabilityId,
      alias: 'buyer',
      dataTypes: ['text'],
      provider: 'postgres',
    });

    expect(withTrim).not.toBe(base);
    const projected = await projectSubstraitToPostgresSql(withUpper);
    expect(projected.projection.outputs[1]).toMatchObject({ name: 'buyer', dataType: 'string' });
    const inspection = inspectDvtSubstraitProjectionDraft(withUpper);
    expect(inspection.ok && inspection.projection.outputs[1]?.operations).toEqual([
      'trim',
      'upper',
    ]);
    expect(
      applyDvtSubstraitProjectionFunction(base, {
        fieldId: 'output:amount',
        operandFieldIds: ['output:amount'],
        capabilityId: trim.capabilityId,
        alias: 'amount',
        dataTypes: ['numeric'],
        provider: 'postgres',
      })
    ).toBe(base);
  });
});
