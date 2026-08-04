import { describe, expect, it } from 'vitest';

import { parseObjectFileRows } from '../src/objectFileRows.js';

import { SOURCE_BYTES, STEP_CONFIG } from './objectFilePostgresTestFixtures.js';

describe('parseObjectFileRows', () => {
  it('maps typed CSV fields to target columns', async () => {
    await expect(
      parseObjectFileRows(SOURCE_BYTES, STEP_CONFIG.source, STEP_CONFIG.columns)
    ).resolves.toEqual([
      { order_id: '1', amount: '10.25', active: true },
      { order_id: '2', amount: '20.50', active: false },
    ]);
  });

  it('maps one JSON Lines object using the same column contract', async () => {
    const source = {
      ...STEP_CONFIG.source,
      format: 'jsonl' as const,
      mediaType: 'application/x-ndjson' as const,
    };
    delete (source as Partial<typeof STEP_CONFIG.source>).header;
    delete (source as Partial<typeof STEP_CONFIG.source>).delimiter;

    await expect(
      parseObjectFileRows(
        Buffer.from('{"order_id":"7","amount":"3.50","active":true}\n'),
        source,
        STEP_CONFIG.columns
      )
    ).resolves.toEqual([{ order_id: '7', amount: '3.50', active: true }]);
  });

  it('rejects unsafe JSON numbers before they can corrupt bigint identity', async () => {
    const source = {
      ...STEP_CONFIG.source,
      format: 'jsonl' as const,
      mediaType: 'application/x-ndjson' as const,
    };
    delete (source as Partial<typeof STEP_CONFIG.source>).header;
    delete (source as Partial<typeof STEP_CONFIG.source>).delimiter;

    await expect(
      parseObjectFileRows(
        Buffer.from('{"order_id":9007199254740993,"amount":"3.50","active":true}\n'),
        source,
        STEP_CONFIG.columns
      )
    ).rejects.toMatchObject({ name: 'ObjectFileIngestionRejectedError' });
  });

  it.each([
    ['missing required field', 'order_id,amount,active\n,10.25,true\n'],
    ['invalid bigint', 'order_id,amount,active\n1.5,10.25,true\n'],
    ['invalid boolean', 'order_id,amount,active\n1,10.25,yes\n'],
    ['duplicate header', 'order_id,amount,active,active\n1,10.25,true,false\n'],
  ])('rejects %s without exposing row payloads', async (_label, csv) => {
    await expect(
      parseObjectFileRows(Buffer.from(csv), STEP_CONFIG.source, STEP_CONFIG.columns)
    ).rejects.toMatchObject({ name: 'ObjectFileIngestionRejectedError' });
  });

  it.each([
    ['timestamp', '2026-02-31T10:30:00'],
    ['timestamp-with-time-zone', '2026-02-31T10:30:00Z'],
    ['timestamp', '2026-04-30T24:00:00'],
    ['timestamp-with-time-zone', '2026-04-30T10:60:00+01:00'],
  ] as const)(
    'rejects calendar-invalid %s values before database access',
    async (dataType, value) => {
      await expect(
        parseObjectFileRows(Buffer.from(`occurred_at\n${value}\n`), STEP_CONFIG.source, [
          {
            sourceField: 'occurred_at',
            targetColumn: 'occurred_at',
            dataType,
            nullable: false,
          },
        ])
      ).rejects.toMatchObject({
        name: 'ObjectFileIngestionRejectedError',
        code: 'OBJECT_SOURCE_FIELD_INVALID',
      });
    }
  );

  it.each([
    ['timestamp', '2024-02-29T10:30:00.123456'],
    ['timestamp-with-time-zone', '2024-02-29T10:30:00.123456+01:00'],
  ] as const)('accepts calendar-valid %s values', async (dataType, value) => {
    await expect(
      parseObjectFileRows(Buffer.from(`occurred_at\n${value}\n`), STEP_CONFIG.source, [
        {
          sourceField: 'occurred_at',
          targetColumn: 'occurred_at',
          dataType,
          nullable: false,
        },
      ])
    ).resolves.toEqual([{ occurred_at: value }]);
  });
});
