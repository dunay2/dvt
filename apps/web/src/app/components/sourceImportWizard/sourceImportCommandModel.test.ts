import { describe, expect, it, vi } from 'vitest';

import {
  buildSourceImportCommand,
  resolveSourceImportCommandIdentity,
  type SourceImportCommandDraft,
} from './sourceImportCommandModel';

const COMMAND_DRAFT: SourceImportCommandDraft = {
  canvasId: 'canvas-orders',
  connectionId: 'warehouse-prod',
  objects: [
    { objectId: 'relation/analytics/erp/orders' },
    { objectId: 'relation/analytics/erp/customers' },
  ],
  groupingStrategy: 'schema',
  includeColumns: true,
  addTests: false,
  addFreshness: false,
};

describe('sourceImportCommandModel', () => {
  it('builds the shared V2 command with the active Canvas identity', () => {
    const identity = resolveSourceImportCommandIdentity(COMMAND_DRAFT, null, () => 'import-1');

    expect(buildSourceImportCommand(COMMAND_DRAFT, identity)).toEqual({
      schemaVersion: 'source-import-request.v2',
      idempotencyKey: 'import-1',
      ...COMMAND_DRAFT,
    });
  });

  it('reuses command identity for equivalent retries regardless of selection order', () => {
    const createIdempotencyKey = vi.fn(() => 'import-1');
    const first = resolveSourceImportCommandIdentity(COMMAND_DRAFT, null, createIdempotencyKey);
    const retry = resolveSourceImportCommandIdentity(
      { ...COMMAND_DRAFT, objects: [...COMMAND_DRAFT.objects].reverse() },
      first,
      createIdempotencyKey
    );

    expect(retry).toBe(first);
    expect(createIdempotencyKey).toHaveBeenCalledTimes(1);
  });

  it('rotates command identity when the Canvas or import intent changes', () => {
    const createIdempotencyKey = vi
      .fn<() => string>()
      .mockReturnValueOnce('import-1')
      .mockReturnValueOnce('import-2')
      .mockReturnValueOnce('import-3');
    const first = resolveSourceImportCommandIdentity(COMMAND_DRAFT, null, createIdempotencyKey);
    const differentCanvas = resolveSourceImportCommandIdentity(
      { ...COMMAND_DRAFT, canvasId: 'canvas-finance' },
      first,
      createIdempotencyKey
    );
    const differentOptions = resolveSourceImportCommandIdentity(
      { ...COMMAND_DRAFT, canvasId: 'canvas-finance', addTests: true },
      differentCanvas,
      createIdempotencyKey
    );

    expect(differentCanvas.idempotencyKey).toBe('import-2');
    expect(differentOptions.idempotencyKey).toBe('import-3');
    expect(createIdempotencyKey).toHaveBeenCalledTimes(3);
  });

  it('rotates command identity when the exact imported dbt target changes', () => {
    const createIdempotencyKey = vi
      .fn<() => string>()
      .mockReturnValueOnce('import-1')
      .mockReturnValueOnce('import-2');
    const withTarget: SourceImportCommandDraft = {
      ...COMMAND_DRAFT,
      existingDbtSourceTargets: [
        {
          objectId: 'relation/analytics/erp/orders',
          sourceUniqueId: 'source.analytics.raw.orders',
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'orders',
        },
        {
          objectId: 'relation/analytics/erp/customers',
          sourceUniqueId: 'source.analytics.raw.customers',
          filePath: 'models/sources.yml',
          sourceName: 'raw',
          tableName: 'customers',
        },
      ],
    };
    const first = resolveSourceImportCommandIdentity(withTarget, null, createIdempotencyKey);
    const changed = resolveSourceImportCommandIdentity(
      {
        ...withTarget,
        existingDbtSourceTargets: withTarget.existingDbtSourceTargets?.map((target) =>
          target.sourceUniqueId.endsWith('.orders')
            ? { ...target, tableName: 'orders_renamed' }
            : target
        ),
      },
      first,
      createIdempotencyKey
    );

    expect(changed.idempotencyKey).toBe('import-2');
  });
});
