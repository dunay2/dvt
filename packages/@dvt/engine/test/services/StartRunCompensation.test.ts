import type { EngineRunRef } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import { StartRunCompensation } from '../../src/services/startRun/StartRunCompensation.js';
import { StartRunFailureDiagnostics } from '../../src/services/startRun/StartRunFailureDiagnostics.js';

describe('start compensation sequence characterization', () => {
  it.each(['bootstrap', 'provider_ref_reconciliation'] as const)(
    'preserves exact ref and cancel-before-cleanup for %s',
    async (reason) => {
      const order: string[] = [];
      const runRef: EngineRunRef = {
        provider: 'temporal',
        tenantId: 't',
        workflowId: 'actual-w',
        runId: 'actual-r',
      };
      const cancelRun = vi.fn(async () => {
        order.push('cancel');
      });
      const markIntentResolvedBestEffort = vi.fn(async () => {
        order.push('resolve');
      });
      const compensate = new StartRunCompensation({
        failurePolicy: { markIntentResolvedBestEffort },
        diagnostics: { compensationFailed: vi.fn() },
      });
      const traceContext = {
        tenantId: 't',
        projectId: 'p',
        environmentId: 'e',
        runId: 'logical-r',
      };
      await compensate.compensate({
        adapter: { cancelRun },
        runRef,
        intentId: 'i',
        tenantId: 't',
        runId: 'logical-r',
        traceContext,
        reason,
      });
      expect(order).toEqual(['cancel', 'resolve']);
      expect(cancelRun).toHaveBeenCalledWith(runRef);
      expect(markIntentResolvedBestEffort).toHaveBeenCalledWith({
        intentId: 'i',
        tenantId: 't',
        runId: 'logical-r',
        provider: 'temporal',
        traceContext,
      });
    }
  );

  it.each(['bootstrap', 'provider_ref_reconciliation'] as const)(
    'retains current cleanup behavior after cancel rejection and throwing diagnostics for %s',
    async (reason) => {
      const observability = createNoopObservability();
      vi.spyOn(observability.logs, 'error').mockImplementation(() => {
        throw new Error('sink down');
      });
      const diagnostics = new StartRunFailureDiagnostics({
        observability,
        clock: { nowIsoUtc: () => '2026-09-30T00:00:00Z' },
      });
      const markIntentResolvedBestEffort = vi.fn(async () => {});
      const compensate = new StartRunCompensation({
        failurePolicy: { markIntentResolvedBestEffort },
        diagnostics,
      });
      await expect(
        compensate.compensate({
          adapter: {
            cancelRun: async () => {
              throw 'cancel response lost';
            },
          },
          runRef: { provider: 'temporal', tenantId: 't', workflowId: 'w', runId: 'r' },
          intentId: 'i',
          tenantId: 't',
          runId: 'r',
          reason,
          traceContext: { tenantId: 't', projectId: 'p', environmentId: 'e', runId: 'r' },
        })
      ).resolves.toBeUndefined();
      expect(markIntentResolvedBestEffort).toHaveBeenCalledOnce();
    }
  );
});
