import type { NodeStatusEventV1 } from './contracts.js';

export type SseSink = (evt: NodeStatusEventV1) => void;

export class RunStreamHub {
  private readonly subs = new Map<string, Set<SseSink>>();

  subscribe(runId: string, sink: SseSink): () => void {
    const set = this.subs.get(runId) ?? new Set<SseSink>();
    set.add(sink);
    this.subs.set(runId, set);

    return () => {
      const cur = this.subs.get(runId);
      if (!cur) return;
      cur.delete(sink);
      if (cur.size === 0) this.subs.delete(runId);
    };
  }

  publish(evt: NodeStatusEventV1): void {
    const set = this.subs.get(evt.runId);
    if (!set) return;
    for (const sink of set) sink(evt);
  }
}
