/**
 * @file packages/@dvt/contracts/src/contracts/engine/SignalSemantics.v1.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0006: Contract Tooling Governance
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @decision Signal-to-event derivation semantics are versioned as a contract shared by engine and adapters
 * @consequence Signal evolution can be negotiated by version without hardcoding mapping logic inside engine internals
 * @version 1.0.0
 * @date 2026-04-07
 */
import type { EventType } from '../../engine/IRunStateStore.v1.js';
import type { SignalType } from '../../types/contracts.js';

export type SignalSemanticsVersion = '1.0.0';

export interface SignalSemanticsContract {
  readonly version: SignalSemanticsVersion;
  readonly signalToEventType: Partial<Record<SignalType, EventType>>;
}

export const CURRENT_SIGNAL_SEMANTICS_VERSION: SignalSemanticsVersion = '1.0.0';

export const SIGNAL_SEMANTICS_REGISTRY: Readonly<
  Record<SignalSemanticsVersion, SignalSemanticsContract>
> = {
  '1.0.0': {
    version: '1.0.0',
    signalToEventType: {},
  },
} as const;

export function resolveSignalSemanticsContract(
  supportedVersions?: readonly string[]
): SignalSemanticsContract {
  if (!supportedVersions || supportedVersions.length === 0) {
    return SIGNAL_SEMANTICS_REGISTRY[CURRENT_SIGNAL_SEMANTICS_VERSION];
  }

  if (supportedVersions.includes(CURRENT_SIGNAL_SEMANTICS_VERSION)) {
    return SIGNAL_SEMANTICS_REGISTRY[CURRENT_SIGNAL_SEMANTICS_VERSION];
  }

  throw new Error(
    `SIGNAL_SEMANTICS_VERSION_UNSUPPORTED: expected ${CURRENT_SIGNAL_SEMANTICS_VERSION}, got ${supportedVersions.join(',')}`
  );
}

export function getSignalDerivedEventType(
  signalType: SignalType,
  supportedVersions?: readonly string[]
): EventType | null {
  const contract = resolveSignalSemanticsContract(supportedVersions);
  return contract.signalToEventType[signalType] ?? null;
}
