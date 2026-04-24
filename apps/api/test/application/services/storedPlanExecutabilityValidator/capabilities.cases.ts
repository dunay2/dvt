import { asNonBlankString } from '@dvt/contracts';
import type { IProviderAdapter } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import { StoredPlanExecutabilityValidator } from '../../../../src/application/services/StoredPlanExecutabilityValidator.js';

import { makeAdapter, PLAN_REF, storedPlanArtifact } from './harness.js';

/**
 * Capability-oriented cases for `StoredPlanExecutabilityValidator`.
 */
export function describeStoredPlanExecutabilityValidatorCapabilitiesCases(): void {
  describe('StoredPlanExecutabilityValidator capability checks', () => {
    it('returns OK when the stored executable plan matches the ref and capabilities', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () => storedPlanArtifact()),
        },
        adapters: new Map([['temporal', makeAdapter(['basic-execution', 'workflow.fan.parallel'])]]),
      });

      const result = await validator.validatePlan(PLAN_REF, 'temporal');

      expect(result).toEqual({
        status: 'OK',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
      });
    });

    it('rejects when the adapter lacks a required capability', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              executionPolicy: { requiresCapabilities: [asNonBlankString('workflow.pause')] },
            })
          ),
        },
        adapters: new Map([['temporal', makeAdapter(['basic-execution'])]]),
      });

      const result = await validator.validatePlan(PLAN_REF, 'temporal');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        reason: 'Missing adapter capability: workflow.pause',
        cause: 'workflow.pause',
      });
    });

    it('rejects when the plan requires capabilities but the adapter does not declare any', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              executionPolicy: { requiresCapabilities: [asNonBlankString('workflow.pause')] },
            })
          ),
        },
        adapters: new Map([
          [
            'temporal',
            {
              provider: 'temporal',
              async startRun() {
                throw new Error('not used');
              },
              async cancelRun() {
                throw new Error('not used');
              },
              async getProviderStatusView() {
                throw new Error('not used');
              },
              async signal() {
                throw new Error('not used');
              },
              signalSemanticsVersions() {
                return ['1.0.0'] as const;
              },
            } as IProviderAdapter,
          ],
        ]),
      });

      const result = await validator.validatePlan(PLAN_REF, 'temporal');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: 'Adapter does not declare capabilities required for executability validation',
        cause: 'capabilities',
      });
    });

    it('rejects invalid stepTypeConfig before capability checks', async () => {
      const capabilitiesSpy = vi.fn(() => ['basic-execution']);
      const validator = new StoredPlanExecutabilityValidator({
        fetcher: {
          fetchForValidation: vi.fn(async () =>
            storedPlanArtifact({
              stepTypeConfig: {
                retries: {
                  maxAttempts: 3,
                  backoffMs: 'invalid-backoff-ms',
                },
              },
            })
          ),
        },
        adapters: new Map([
          [
            'temporal',
            {
              ...makeAdapter(['basic-execution']),
              capabilities: capabilitiesSpy,
            },
          ],
        ]),
      });

      const result = await validator.validatePlan(PLAN_REF, 'temporal');

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: expect.stringContaining('INVALID_STEP_TYPE_CONFIG'),
        cause: 'plan_fetch',
      });
      expect(capabilitiesSpy).not.toHaveBeenCalled();
    });
  });
}
