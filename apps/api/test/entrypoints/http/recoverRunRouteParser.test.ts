import { describe, expect, it } from 'vitest';

import { HTTP_ERROR_REASON } from '../../../src/entrypoints/http/httpErrorReasonCatalog.js';
import { parseRecoverRunRequest } from '../../../src/entrypoints/http/recoverRunRouteParser.js';
import { RUN_COMMAND_ACTION } from '../../../src/entrypoints/http/runCommandRoute.constants.js';

describe('parseRecoverRunRequest', () => {
  it('accepts only tenant scope and the server-generated recovery identity', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: ' source-run-1 ',
      recoveryRunId: 'recovery-run-1',
      body: { tenantId: ' tenant-a ' },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          sourceRunId: 'source-run-1',
          recoveryRunId: 'recovery-run-1',
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
        recoveryRunId: 'recovery-run-1',
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
      recoveryRunId: 'recovery-run-1',
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
});
