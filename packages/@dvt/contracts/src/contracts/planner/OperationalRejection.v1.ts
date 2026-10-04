/**
 * Named values for expected admission rejections, not exceptions.
 * @baseline ADR-0044: Diagnostic prose is not a semantic contract.
 * @decision Reuse structural message metadata and the existing rejection envelope.
 * @consequence Callers use definitions; presentation owns translated copy.
 * @version 1.0.0
 */
import { EMPTY_MESSAGE_PARAMS, type MessageDescriptor } from '../../errorContract.js';
import { START_RUN_PLAN_REJECTION_CODE } from '../engine/StartRunBoundary.v1.js';

export type OperationalRejection<Cause extends string = string> = MessageDescriptor<Cause> &
  Readonly<{ code: typeof START_RUN_PLAN_REJECTION_CODE.rejected; cause: Cause; reason: string }>;

export function defineOperationalRejection<const Cause extends string>(
  cause: Cause,
  reason: string
): OperationalRejection<Cause> {
  return Object.freeze({
    code: START_RUN_PLAN_REJECTION_CODE.rejected,
    cause,
    reason,
    messageKey: cause,
    messageParams: EMPTY_MESSAGE_PARAMS,
  });
}
