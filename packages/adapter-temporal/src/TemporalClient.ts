import { Client, Connection } from '@temporalio/client';

import type { TemporalAdapterConfig } from './config.js';

export interface TemporalClientHandle {
  readonly address: string;
  readonly namespace: string;
  readonly identity?: string;
  readonly connection: Connection;
  readonly client: Client;
}

export class TemporalClientManager {
  private handle: TemporalClientHandle | null = null;
  private connecting: Promise<TemporalClientHandle> | null = null;

  constructor(private readonly config: TemporalAdapterConfig) {}

  async connect(): Promise<TemporalClientHandle> {
    if (this.handle) return this.handle;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      const connection = await Connection.connect({ address: this.config.address });
      const client = new Client({
        connection,
        namespace: this.config.namespace,
        identity: this.config.identity,
      });

      const next: TemporalClientHandle = {
        address: this.config.address,
        namespace: this.config.namespace,
        identity: this.config.identity,
        connection,
        client,
      };

      this.handle = next;
      return next;
    })();

    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  isConnected(): boolean {
    return this.handle !== null;
  }

  getClient(): TemporalClientHandle {
    if (!this.handle) {
      throw new Error('TEMPORAL_CLIENT_NOT_CONNECTED');
    }
    return this.handle;
  }

  async ensureConnected(): Promise<void> {
    if (!this.handle) {
      throw new Error('TEMPORAL_CLIENT_NOT_CONNECTED');
    }
    await this.handle.connection.ensureConnected();
  }

  async close(): Promise<void> {
    const current = this.handle;
    this.handle = null;
    this.connecting = null;
    if (current) {
      await current.connection.close();
    }
  }
}
