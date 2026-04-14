import { describe, expect, it } from 'vitest';

import { CONTRACTS_ERROR_CODE, CONTRACTS_ERROR_MESSAGE_KEY } from '../../src/errorContract.js';
import {
  ContractValidationError,
  parsePlanRef,
  parseRecoverRunCommand,
  parseSignalRequest,
  toValidationErrorResponse,
} from '../../src/validation.js';

export function registerValidationSignalAndErrorSuite(): void {
  describe('signal and error contracts', () => {
    it('parses PlanRef with valid input', () => {
      const planRef = parsePlanRef({
        uri: 's3://bucket/plan.json',
        sha256: 'abc123',
        schemaVersion: '1.0.0',
        planId: 'plan-1',
        planVersion: 'v1',
      });

      expect(planRef.planId).toBe('plan-1');
      expect(planRef.sha256).toBe('abc123');
    });

    it('throws ContractValidationError for invalid signal type', () => {
      expect(() =>
        parseSignalRequest({
          signalId: 'sig-1',
          type: 'INVALID_SIGNAL',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects SignalRequest when signalId is only whitespace', () => {
      expect(() =>
        parseSignalRequest({
          signalId: '   ',
          type: 'PAUSE',
        })
      ).toThrow(ContractValidationError);
    });

    it('uses canonical validation message keys instead of hardcoded english text', () => {
      try {
        parseSignalRequest({
          signalId: 'sig-1',
          type: 'INVALID_SIGNAL',
        });
        throw new Error('Expected parseSignalRequest to fail');
      } catch (error) {
        const response = toValidationErrorResponse(error);
        expect(response.code).toBe(CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED);
        expect(response.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED);
        expect(response.messageParams).toEqual({});
        expect(response.message).toBe('Validation failed');
      }

      const response = toValidationErrorResponse(new Error('boom'));
      expect(response.code).toBe(CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED);
      expect(response.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED);
      expect(response.messageParams).toEqual({});
      expect(response.message).toBe('Validation failed');
      expect(response.details[0]?.message).toBe('Unknown validation error');
    });

    it('rejects RETRY_STEP because it is no longer part of canonical SignalType', () => {
      expect(() =>
        parseSignalRequest({
          signalId: 'sig-retry-step-1',
          type: 'RETRY_STEP',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects RETRY_RUN because recovery is no longer part of canonical SignalType', () => {
      expect(() =>
        parseSignalRequest({
          signalId: 'sig-retry-run-1',
          type: 'RETRY_RUN',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects RecoverRunCommand when recovery runId equals source runId', () => {
      expect(() =>
        parseRecoverRunCommand({
          sourceRunId: 'run-1',
          planRef: {
            uri: 'https://plans.example/plan.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: 'plan-1',
            planVersion: '1.0.0',
          },
          context: {
            tenantId: 'tenant-a',
            projectId: 'project-a',
            environmentId: 'prod',
            runId: 'run-1',
            targetAdapter: 'temporal',
          },
        })
      ).toThrow(ContractValidationError);
    });
  });
}
