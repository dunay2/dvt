import type { ApiClient } from '../../services/api/createApiClient';
import type { PlatformConnectionState } from '../../../capabilities/platform-health';
import type { RunContext } from '../../types/engine';
import type { LocalizableString, PluginCapabilityId, RegisteredPlugin } from './PluginManifest';

// ---------------------------------------------------------------------------
// Plugin event bus — typed pub/sub for decoupled plugin communication
// ---------------------------------------------------------------------------

export interface PluginEventBus {
  publish<T>(topic: string, payload: T): void;
  /** Returns an unsubscribe function */
  subscribe<T>(topic: string, handler: (payload: T) => void): () => void;
}

// ---------------------------------------------------------------------------
// Standard shell topics (shell publishes, plugins subscribe):
//
//   'shell:session.changed'   → SessionChangedEvent
//   'shell:node.selected'     → { nodeIds: string[] }
//   'shell:run.started'       → { runId: string; planRef: import('../../types/engine').PlanRef }
//   'shell:plugin.unregistered' → { pluginId: string }
//
// Standard plugin topics (plugins publish, others subscribe):
//   'monitoring:run.completed' → { runId: string; status: string }
//   'monitoring:run.failed'    → { runId: string; reason: string }
//   'monitoring:run.started'   → { runId: string }
//   'cost:analysis.ready'      → { runId: string; nodesCost: NodeCostData[] }
// ---------------------------------------------------------------------------

export interface SessionChangedEvent {
  tenantId: string;
  projectId: string;
  environmentId: string;
  targetAdapter: string;
}

// ---------------------------------------------------------------------------
// PluginContext — shell-to-plugin interface
//
// Plugins READ state through this interface.
// Plugins WRITE back through the controlled shell.* callbacks.
// Plugins NEVER import appStore, sessionStore, or any shell store directly.
// ---------------------------------------------------------------------------

export interface PluginContext {
  /** Session state — read-only projection of sessionStore */
  session: {
    tenantId: string;
    projectId: string;
    environmentId: string;
    targetAdapter: string;
    buildRunContext: (runId: string) => RunContext;
  };

  /** Platform health state */
  platform: {
    connectionStatus: PlatformConnectionState;
    isReady: boolean;
  };

  /** Current canvas state — read-only */
  canvas: {
    selectedNodeIds: ReadonlyArray<string>;
    activeExclusiveOverlayId: string | null;
    activeAdditiveOverlayIds: ReadonlyArray<string>;
  };

  /** Controlled write-back callbacks — the only way plugins interact with shell state */
  shell: {
    navigate: (path: string) => void;
    openModal: (modalId: string, props?: Record<string, unknown>) => void;
    toast: (message: LocalizableString, variant: 'success' | 'error' | 'info') => void;
    setActiveOverlay: (overlayId: string | null) => void;
    /** Plugin calls this when a capability fails but the plugin wants to stay registered */
    reportDegraded: (pluginId: string, capability: PluginCapabilityId, reason: string) => void;
  };

  /** Decoupled plugin-to-plugin communication */
  eventBus: PluginEventBus;

  /**
   * Access to other registered plugins.
   * Only plugins declared in requires/optionalRequires are accessible this way.
   */
  getPlugin: (pluginId: string) => RegisteredPlugin | null;

  /** Base HTTP client — X-Tenant-Id and X-Project-Id injected automatically */
  apiClient: ApiClient;
}
