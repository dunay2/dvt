import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseCanonicalRunStatus,
  parseRunEventWrite,
} from '../../src/validation.js';

export function registerValidationRunLifecycleSuite(): void {
  describe('run lifecycle contracts', () => {
    it('parses CanonicalRunStatus with TF-C2-B result evidence fields', () => {
      const status = parseCanonicalRunStatus({
        runId: 'run-1',
        status: 'COMPLETED',
        execution: {
          activeStepId: 'step-evidence',
          failure: {
            stepId: 'step-transform',
            reason: 'SINK_WRITE_FAILED',
            message: 'duplicate key value violates unique constraint',
            failedAt: '2026-04-08T10:00:03.000Z',
          },
          materialization: {
            executor: 'postgres',
            environmentId: 'prod',
            sinkTable: 'analytics.orders_daily',
            rowsWritten: 42,
            startedAt: '2026-04-08T10:00:00.000Z',
            completedAt: '2026-04-08T10:00:04.000Z',
            durationMs: 4000,
          },
        },
      });

      expect(status.execution?.activeStepId).toBe('step-evidence');
      expect(status.execution?.failure?.stepId).toBe('step-transform');
      expect(status.execution?.materialization?.sinkTable).toBe('analytics.orders_daily');
      expect(status.execution?.materialization?.rowsWritten).toBe(42);
    });

    it('rejects CanonicalRunStatus when failure.failedAt is only whitespace', () => {
      expect(() =>
        parseCanonicalRunStatus({
          runId: 'run-1',
          status: 'FAILED',
          execution: {
            failure: {
              stepId: 'step-transform',
              reason: 'SINK_WRITE_FAILED',
              failedAt: '   ',
            },
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects CanonicalRunStatus when failure.failedAt is not strict ISO UTC', () => {
      expect(() =>
        parseCanonicalRunStatus({
          runId: 'run-1',
          status: 'FAILED',
          execution: {
            failure: {
              stepId: 'step-transform',
              reason: 'SINK_WRITE_FAILED',
              failedAt: '2026-02-30T10:00:00.000Z',
            },
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects CanonicalRunStatus when substatus is provider-scoped instead of canonical', () => {
      expect(() =>
        parseCanonicalRunStatus({
          runId: 'run-1',
          status: 'RUNNING',
          substatus: 'temporal/WORKFLOW_TASK_BACKLOG',
        })
      ).toThrow(ContractValidationError);
    });

    it('parses CanonicalRunStatus when timestamps are strict ISO UTC strings', () => {
      const status = parseCanonicalRunStatus({
        runId: 'run-1',
        status: 'RUNNING',
        startedAt: '2026-04-08T10:00:00.000Z',
        completedAt: '2026-04-08T10:05:00.000Z',
      });

      expect(status.startedAt).toBe('2026-04-08T10:00:00.000Z');
      expect(status.completedAt).toBe('2026-04-08T10:05:00.000Z');
    });

    it('rejects CanonicalRunStatus when timestamps are not strict ISO UTC strings', () => {
      expect(() =>
        parseCanonicalRunStatus({
          runId: 'run-1',
          status: 'RUNNING',
          startedAt: '2026-04-08 10:00:00Z',
        })
      ).toThrow(ContractValidationError);

      expect(() =>
        parseCanonicalRunStatus({
          runId: 'run-1',
          status: 'COMPLETED',
          completedAt: 'not-a-date',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects RunEventWrite when emittedAt is not strict ISO UTC', () => {
      expect(() =>
        parseRunEventWrite({
          eventId: 'evt-run-started-invalid-time',
          eventType: 'RunStarted',
          payloadVersion: 1,
          emittedAt: '2026-04-08 10:00:00Z',
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          runId: 'run-1',
          planId: 'plan-1',
          planVersion: '1.0.0',
          engineAttemptId: 1,
          logicalAttemptId: 1,
          idempotencyKey: 'run-started-invalid-time',
        })
      ).toThrow(ContractValidationError);
    });
  });
}
