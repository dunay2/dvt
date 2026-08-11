import type { SupportedSignalType } from '../../application/ports/runtime.js';

export const SUPPORTED_SIGNAL_TYPES: ReadonlySet<SupportedSignalType> = new Set([
  'PAUSE',
  'RESUME',
  'CANCEL',
]);

export type SignalRouteCompatibilityPolicy = {
  readonly allowCancelSignalType: boolean;
};
