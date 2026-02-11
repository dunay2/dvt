import crypto from 'crypto';
import { TenantId } from '../contracts/types';

export interface IdempotencyKeyComponents {
  readonly tenantId: TenantId;
  readonly planId: string;
  readonly contractVersion: string;
  readonly eventType: string;
  readonly runId: string;
  readonly stepId: string;
  readonly attemptId: string;
}

export function generateIdempotencyKey(components: IdempotencyKeyComponents): string {
  const payload = [
    components.tenantId,
    components.planId,
    components.contractVersion,
    components.eventType,
    components.runId,
    components.stepId,
    components.attemptId,
  ].join(':');
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}
