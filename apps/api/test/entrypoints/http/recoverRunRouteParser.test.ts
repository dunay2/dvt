import { describe, expect, it } from 'vitest';

import { HTTP_ERROR_REASON } from '../../../src/entrypoints/http/httpErrorReasonCatalog.js';
import { parseRecoverRunRequest } from '../../../src/entrypoints/http/recoverRunRouteParser.js';
import { RUN_COMMAND_ACTION } from '../../../src/entrypoints/http/runCommandRoute.constants.js';

describe('parseRecoverRunRequest', () => {
  it('maps recover request to run:retry action', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: ' source-run-1 ',
      body: {
        tenantId: ' tenant-a ',
        recoveryRunId: ' recovery-run-1 ',
        planRef: {
          uri: 'https://plans.example/plan.json',
          sha256: 'a'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          sourceRunId: 'source-run-1',
          recoveryRunId: 'recovery-run-1',
          planRef: {
            uri: 'https://plans.example/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0.0',
          },
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: RUN_COMMAND_ACTION.RETRY,
        },
      },
    });
  });

  it('preserves pluginCompatibilityFingerprint in runExecutionContextRef', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: 'source-run-1',
      body: {
        tenantId: 'tenant-a',
        recoveryRunId: 'recovery-run-1',
        runExecutionContextRef: {
          uri: 'dvt-runctx://tenant-a/recovery-run-1',
          sha256: 'b'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
          pluginCompatibilityFingerprint: 'c'.repeat(64),
        },
        planRef: {
          uri: 'https://plans.example/plan.json',
          sha256: 'a'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          sourceRunId: 'source-run-1',
          recoveryRunId: 'recovery-run-1',
          runExecutionContextRef: {
            uri: 'dvt-runctx://tenant-a/recovery-run-1',
            sha256: 'b'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0.0',
            pluginCompatibilityFingerprint: 'c'.repeat(64),
          },
          planRef: {
            uri: 'https://plans.example/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0.0',
          },
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: RUN_COMMAND_ACTION.RETRY,
        },
      },
    });
  });

  it('rejects invalid source run id', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: '  ',
      body: {
        tenantId: 'tenant-a',
        recoveryRunId: 'recovery-run-1',
        planRef: {
          uri: 'https://plans.example/plan.json',
          sha256: 'a'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      },
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

  it('rejects invalid targetAdapter', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: 'source-run-1',
      body: {
        tenantId: 'tenant-a',
        recoveryRunId: 'recovery-run-1',
        targetAdapter: 'invalid',
        planRef: {
          uri: 'https://plans.example/plan.json',
          sha256: 'a'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.invalidTargetAdapter,
        target: 'targetAdapter',
      },
    });
  });

  it('accepts recover targetAdapter values from the configured catalog', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: 'source-run-1',
      body: {
        tenantId: 'tenant-a',
        recoveryRunId: 'recovery-run-1',
        targetAdapter: 'temporal',
        planRef: {
          uri: 'https://plans.example/plan.json',
          sha256: 'a'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          sourceRunId: 'source-run-1',
          recoveryRunId: 'recovery-run-1',
          targetAdapter: 'temporal',
          planRef: {
            uri: 'https://plans.example/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-a',
            planVersion: '1.0.0',
          },
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: RUN_COMMAND_ACTION.RETRY,
        },
      },
    });
  });

  it('rejects when recoveryRunId equals sourceRunId', () => {
    const parsed = parseRecoverRunRequest({
      sourceRunId: 'same-run-id',
      body: {
        tenantId: 'tenant-a',
        recoveryRunId: 'same-run-id',
        planRef: {
          uri: 'https://plans.example/plan.json',
          sha256: 'a'.repeat(64),
          schemaVersion: 'v1.0',
          planId: 'plan-a',
          planVersion: '1.0.0',
        },
      },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.conflictingRunIds,
        target: 'recoveryRunId',
      },
    });
  });
});
