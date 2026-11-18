/**
 * Owned concern: remember the last admitted Model editor identity in this browser tab.
 * @baseline ADR-0069: navigation preferences belong to the scoped presentation.
 * @decision Keep one reference and validate its scope before reading it.
 * @consequence Reloads can restore a choice without retaining graph or editor contents.
 * @version 1.0.0
 */
import type { WorkspaceScope } from '../../ports/sessionContext';
import { isRecord } from '../../types/canonicalGuards';

const preferenceKey = 'dvt:canvas:last-model:v1';

export function canvasModelNavigationScopeKey(
  scope: WorkspaceScope | undefined,
  canvasId: string | null,
  projectRoot?: string
): string | null {
  return scope == null || canvasId == null
    ? null
    : JSON.stringify([
        scope.tenantId,
        scope.projectId,
        scope.environmentId,
        scope.targetAdapter,
        canvasId,
        projectRoot,
      ]);
}

export function readCanvasModelNavigationPreference(scopeKey: string | null): string | undefined {
  if (scopeKey == null) return;
  try {
    const raw = window.sessionStorage.getItem(preferenceKey);
    const value: unknown = raw == null ? null : JSON.parse(raw);
    if (isRecord(value) && value.scopeKey === scopeKey && typeof value.nodeId === 'string')
      return value.nodeId;
  } catch {
    // Missing storage or a damaged preference leaves the current catalogue authoritative.
  }
}

export function rememberCanvasModelNavigation(scopeKey: string | null, nodeId: string): void {
  if (scopeKey == null) return;
  try {
    window.sessionStorage.setItem(preferenceKey, JSON.stringify({ scopeKey, nodeId }));
  } catch {
    // Opening the editor still works when this browser denies session storage.
  }
}
