import { describe, expect, it } from 'vitest';

import { HTTP_ERROR_REASON } from '../../../src/entrypoints/http/httpErrorReasonCatalog.js';
import { parseRecoverRunRequest } from '../../../src/entrypoints/http/recoverRunRouteParser.js';
import { RUN_COMMAND_ACTION } from '../../../src/entrypoints/http/runCommandRoute.constants.js';

describe('parseRecoverRunRequest', () => {
  it('accepts only tenant scope and the server-generated recovery identity', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: ' source-run-1 ',
      idempotencyKey: ' recover-source-1 ',
      body: { tenantId: ' tenant-a ' },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          sourceRunId: 'source-run-1',
          recoveryRunId: expect.stringMatching(/^run_recovery_[a-f0-9]{40}$/),
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: RUN_COMMAND_ACTION.RETRY,
        },
      },
    });
  });

  it.each(['recoveryRunId', 'planRef', 'targetAdapter', 'runExecutionContextRef'])(
    'rejects browser-owned %s authority',
    (field) => {
      const parsed = parseRecoverRunRequest({
        sourceRunId: 'source-run-1',
        idempotencyKey: 'recover-source-1',
        body: { tenantId: 'tenant-a', [field]: 'caller-value' },
      });

      expect(parsed).toEqual({
        ok: false,
        issue: {
          type: 'bad_request',
          reason: HTTP_ERROR_REASON.invalidBody,
          target: field,
        },
      });
    }
  );

  it('rejects invalid source run id', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: '  ',
      idempotencyKey: 'recover-source-1',
      body: { tenantId: 'tenant-a' },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.invalidRunId,
        target: 'runId',
      },
    });
  });

  it('requires a command idempotency key', () => {
    expect(
      parseRecoverRunRequest({
        sourceRunId: 'source-run-1',
        idempotencyKey: undefined,
        body: { tenantId: 'tenant-a' },
      })
    ).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.missingIdempotencyKey,
        target: 'idempotency-key',
      },
    });
  });

  it('derives one server-owned run identity for repeated deliveries', () => {
    const request = {
      sourceRunId: 'source-run-1',
      idempotencyKey: 'recover-source-1',
      body: { tenantId: 'tenant-a' },
    } as const;

    const first = parseRecoverRunRequest(request);
    const repeated = parseRecoverRunRequest(request);
    const nextIntent = parseRecoverRunRequest({ ...request, idempotencyKey: 'recover-source-2' });

    expect(first).toEqual(repeated);
    expect(first.ok && nextIntent.ok && first.value.command.recoveryRunId).not.toBe(
      nextIntent.ok ? nextIntent.value.command.recoveryRunId : undefined
    );
  });
});
