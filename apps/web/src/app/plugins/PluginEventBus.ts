import type { PluginEventBus } from './contracts/PluginContext';

// ---------------------------------------------------------------------------
// PluginEventBus implementation
//
// Lightweight typed pub/sub for decoupled plugin-to-plugin communication.
// The shell owns the bus instance and injects it into every PluginContext.
// ---------------------------------------------------------------------------

export class PluginEventBusImpl implements PluginEventBus {
  private readonly handlers = new Map<string, Set<(payload: unknown) => void>>();

  publish<T>(topic: string, payload: T): void {
    const subs = this.handlers.get(topic);
    if (!subs) return;
    for (const handler of subs) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[PluginEventBus] Error in handler for topic "${topic}":`, err);
      }
    }
  }

  subscribe<T>(topic: string, handler: (payload: T) => void): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    const typedHandler = handler as (payload: unknown) => void;
    this.handlers.get(topic)!.add(typedHandler);

    return () => {
      this.handlers.get(topic)?.delete(typedHandler);
    };
  }

  /** Remove all subscribers for a specific topic. Used by unregister(). */
  clearTopic(topic: string): void {
    this.handlers.delete(topic);
  }

  /** Remove all subscribers. Used for testing and teardown. */
  clearAll(): void {
    this.handlers.clear();
  }
}

// ---------------------------------------------------------------------------
// Standard shell topic constants
// ---------------------------------------------------------------------------

export const SHELL_TOPICS = {
  SESSION_CHANGED: 'shell:session.changed',
  NODE_SELECTED: 'shell:node.selected',
  RUN_STARTED: 'shell:run.started',
  PLUGIN_UNREGISTERED: 'shell:plugin.unregistered',
} as const;

export const MONITORING_TOPICS = {
  RUN_STARTED: 'monitoring:run.started',
  RUN_COMPLETED: 'monitoring:run.completed',
  RUN_FAILED: 'monitoring:run.failed',
} as const;

export const COST_TOPICS = {
  ANALYSIS_READY: 'cost:analysis.ready',
} as const;

export const DBT_TOPICS = {
  MANIFEST_IMPORTED: 'dbt:manifest.imported',
  MANIFEST_CLEARED: 'dbt:manifest.cleared',
} as const;
