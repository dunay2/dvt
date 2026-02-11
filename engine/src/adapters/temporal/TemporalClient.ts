/**
 * DVT Engine - Temporal Client Wrapper
 * Phase 1: Basic client configuration and connection management
 */

import { Connection, Client } from '@temporalio/client';

/**
 * Configuration for Temporal connection.
 */
export interface TemporalConfig {
  address?: string; // Default: 'localhost:7233'
  namespace?: string; // Default: 'default'
  tls?: {
    clientCertPath?: string;
    clientKeyPath?: string;
    serverNameOverride?: string;
    serverRootCACertPath?: string;
  };
  identity?: string; // Client identity (e.g., 'dvt-engine-v1')
  taskQueue?: string; // Default task queue (e.g., 'tq-control-prod')
}

/**
 * Wrapper for Temporal SDK client.
 * Manages connection lifecycle and provides workflow client.
 *
 * Phase 1: Basic connection management
 * Phase 2+: Connection pooling, retry logic, health checks
 */
export class TemporalClient {
  private connection: Connection | null = null;
  private client: Client | null = null;
  private config: Required<
    Omit<TemporalConfig, 'tls' | 'identity' | 'taskQueue'>
  > &
    Pick<TemporalConfig, 'tls' | 'identity' | 'taskQueue'>;

  constructor(config: TemporalConfig = {}) {
    this.config = {
      address: config.address || 'localhost:7233',
      namespace: config.namespace || 'default',
      tls: config.tls,
      identity: config.identity,
      taskQueue: config.taskQueue,
    };
  }

  /**
   * Connect to Temporal server.
   * Idempotent: Returns existing connection if already connected.
   */
  async connect(): Promise<void> {
    if (this.connection && this.client) {
      return;
    }

    try {
      // Create connection
      this.connection = await Connection.connect({
        address: this.config.address,
        tls: this.config.tls,
      });

      // Create workflow client from connection
      this.client = new Client({
        connection: this.connection,
        namespace: this.config.namespace,
        identity: this.config.identity,
      });
    } catch (error) {
      throw new Error(
        `Failed to connect to Temporal at ${this.config.address}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get the workflow client.
   * Throws if not connected.
   */
  getClient(): Client {
    if (!this.client) {
      throw new Error(
        'TemporalClient not connected. Call connect() first.',
      );
    }
    return this.client;
  }

  /**
   * Get the connection.
   * Throws if not connected.
   */
  getConnection(): Connection {
    if (!this.connection) {
      throw new Error(
        'TemporalClient not connected. Call connect() first.',
      );
    }
    return this.connection;
  }

  /**
   * Close the connection.
   * Idempotent: Safe to call multiple times.
   */
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.client = null;
    }
  }

  /**
   * Get namespace.
   */
  getNamespace(): string {
    return this.config.namespace;
  }

  /**
   * Get default task queue.
   */
  getTaskQueue(): string | undefined {
    return this.config.taskQueue;
  }
}
