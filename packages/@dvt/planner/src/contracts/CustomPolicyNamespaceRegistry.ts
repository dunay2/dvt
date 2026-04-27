/**
 * Owned concern: resolve custom policy namespace registration for planner policy checks.
 * Shared namespace entry and validation vocabulary remains in `@dvt/contracts`.
 */
import type { CustomPolicyNamespaceEntry } from '@dvt/contracts';

export interface ICustomPolicyNamespaceRegistry {
  lookup(namespace: string): CustomPolicyNamespaceEntry | undefined;

  listNamespaces(): readonly string[];
}
