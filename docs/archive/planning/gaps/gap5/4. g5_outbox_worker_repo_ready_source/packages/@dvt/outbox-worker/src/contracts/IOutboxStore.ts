import type { ClaimedOutboxRecord, DeliveryChannel, SideEffectKind, TopicName } from '../types.js';

export interface ClaimNextBatchInput {
  readonly now: Date;
  readonly leaseOwnerId: string;
  readonly batchSize: number;
  readonly leaseDurationMs: number;
  readonly topics?: readonly TopicName[];
  readonly deliveryChannels?: readonly DeliveryChannel[];
  readonly sideEffectKinds?: readonly SideEffectKind[];
}

export interface ScheduleRetryInput {
  readonly recordId: string;
  readonly now: Date;
  readonly nextAttemptAt: Date;
  readonly leaseOwnerId: string;
  readonly reasonCode: string;
  readonly detail?: string;
}

export interface MoveToDeadLetterInput {
  readonly recordId: string;
  readonly now: Date;
  readonly leaseOwnerId: string;
  readonly reasonCode: string;
  readonly detail?: string;
}

export interface AckDeliveredInput {
  readonly recordId: string;
  readonly now: Date;
  readonly leaseOwnerId: string;
  readonly receipt?: string;
}

export interface AckIgnoredInput {
  readonly recordId: string;
  readonly now: Date;
  readonly leaseOwnerId: string;
  readonly reasonCode: string;
  readonly detail?: string;
}

export interface ReleaseLeaseInput {
  readonly recordId: string;
  readonly now: Date;
  readonly leaseOwnerId: string;
  readonly reasonCode: string;
  readonly detail?: string;
}

export interface IOutboxStore {
  claimNextBatch(input: ClaimNextBatchInput): Promise<readonly ClaimedOutboxRecord[]>;
  ackDelivered(input: AckDeliveredInput): Promise<void>;
  ackIgnored(input: AckIgnoredInput): Promise<void>;
  scheduleRetry(input: ScheduleRetryInput): Promise<void>;
  moveToDeadLetter(input: MoveToDeadLetterInput): Promise<void>;
  releaseLease(input: ReleaseLeaseInput): Promise<void>;
}
