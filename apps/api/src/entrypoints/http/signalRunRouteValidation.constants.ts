import type { SupportedSignalType } from '../../application/ports/runtime.js';

export const SUPPORTED_SIGNAL_TYPES: ReadonlySet<SupportedSignalType> = new Set([
  'PAUSE',
  'RESUME',
  'CANCEL',
]);

export const SIGNAL_ROUTE_COMPATIBILITY_POLICY = {
  // Keep /signal supporting CANCEL while dedicated /cancel route coexists.
  allowCancelSignalType: true,
} as const;

export type SignalRouteCompatibilityPolicy = {
  readonly allowCancelSignalType: boolean;
};
