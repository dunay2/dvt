/**
 * Owned concern: resolve custom policy namespace registration for planner policy checks.
 * Shared namespace entry and validation vocabulary remains in `@dvt/contracts`.
 *
 * Frozen compatibility seam: AR-A4 keeps this port source-compatible but
 * inactive. Do not add implementations, registration APIs, or validation
 * behavior without a real consumer and ADR-backed reactivation.
 */
import type { CustomPolicyNamespaceEntry } from '@dvt/contracts';

export interface ICustomPolicyNamespaceRegistry {
  lookup(namespace: string): CustomPolicyNamespaceEntry | undefined;

  listNamespaces(): readonly string[];
}
