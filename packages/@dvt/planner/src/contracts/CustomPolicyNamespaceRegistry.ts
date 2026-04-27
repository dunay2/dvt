import type { CustomPolicyNamespaceEntry } from '@dvt/contracts';

/**
 * Planner-owned behavior port for resolving registered custom policy namespaces.
 * Shared namespace entry and validation vocabulary remains in `@dvt/contracts`.
 */
export interface ICustomPolicyNamespaceRegistry {
  lookup(namespace: string): CustomPolicyNamespaceEntry | undefined;

  listNamespaces(): readonly string[];
}
