/**
 * @file packages/@dvt/adapter-temporal/src/TemporalClient.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0003: Execution Model
 * @decision Section 3 — Centralize Temporal client connection lifecycle in a single manager
 * @consequence Adapter interactions reuse a deterministic client handle and controlled connect/close semantics
 * @version 1.1.0
 * @date 2026-03-08
 */
import type { IObservability } from '@dvt/observability';
import { Client, Connection } from '@temporalio/client';

import type { TemporalAdapterConfig } from './config.js';
import {
  buildTemporalContext,
  withAbortSignalTimeout,
  buildTemporalMetricTags,
  resolveTemporalObservability,
  runObservedTemporalOperation,
  toErrorMessage,
} from './temporalObservability.js';

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
  private readonly observability: IObservability;

  constructor(
    private readonly config: TemporalAdapterConfig,
    observability?: IObservability
  ) {
    this.observability = resolveTemporalObservability(observability);
  }

  async connect(): Promise<TemporalClientHandle> {
    if (this.handle) return this.handle;
    if (this.connecting) return this.connecting;

    const context = buildTemporalContext(this.config);
    const attributes = {
      address: this.config.connection.address,
      namespace: this.config.connection.namespace,
      identity: this.config.connection.identity ?? '',
    };

    this.connecting = runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.client.connect',
      spanAttributes: attributes,
      counterName: 'dvt.temporal.client.connect_total',
      durationName: 'dvt.temporal.client.connect.duration_ms',
      metricOperation: 'connect',
      run: async () => {
        this.observability.logs.info({
          msg: 'Connecting Temporal client',
          context,
          attributes,
        });

        const connection = await Connection.connect({
          address: this.config.connection.address,
          connectTimeout: this.config.timeouts.connectTimeoutMs,
        });
        const client = new Client({
          connection,
          namespace: this.config.connection.namespace,
          identity: this.config.connection.identity,
        });

        const next: TemporalClientHandle = {
          address: this.config.connection.address,
          namespace: this.config.connection.namespace,
          identity: this.config.connection.identity,
          connection,
          client,
        };

        this.handle = next;
        return next;
      },
      onSuccess: () => ({
        result: 'ok',
        logMessage: 'Temporal client connected',
        logLevel: 'info',
        logAttributes: attributes,
      }),
      onError: (error) => ({
        result: 'error',
        logMessage: 'Temporal client connect failed',
        logLevel: 'error',
        logAttributes: {
          ...attributes,
          error: toErrorMessage(error),
        },
      }),
    });

    try {
      return await this.connecting!;
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
    const current = this.handle;
    if (!current) {
      throw new Error('TEMPORAL_CLIENT_NOT_CONNECTED');
    }

    const context = buildTemporalContext(this.config);
    await runObservedTemporalOperation({
      observability: this.observability,
      context,
      spanName: 'temporal.client.ensureConnected',
      spanAttributes: {
        address: this.config.connection.address,
        namespace: this.config.connection.namespace,
      },
      counterName: 'dvt.temporal.client.ensure_connected_total',
      durationName: 'dvt.temporal.client.ensure_connected.duration_ms',
      metricOperation: 'ensureConnected',
      run: async () => {
        await withAbortSignalTimeout(
          (signal) =>
            current.connection.withAbortSignal(signal, () => current.connection.ensureConnected()),
          this.config.timeouts.requestTimeoutMs,
          'temporal.ensureConnected'
        );
      },
      onError: (error) => ({
        result: 'error',
        logMessage: 'Temporal client health check failed',
        logLevel: 'error',
        logAttributes: {
          address: this.config.connection.address,
          namespace: this.config.connection.namespace,
          error: toErrorMessage(error),
        },
      }),
    });
  }

  async close(): Promise<void> {
    const current = this.handle;
    this.handle = null;
    this.connecting = null;
    if (current) {
      this.observability.logs.info({
        msg: 'Closing Temporal client',
        context: buildTemporalContext(this.config),
        attributes: {
          address: this.config.connection.address,
          namespace: this.config.connection.namespace,
        },
      });
      await current.connection.close();
      this.observability.metrics
        .counter('dvt.temporal.client.close_total', buildTemporalMetricTags('close', 'ok'))
        .add(1);
    }
  }
}
