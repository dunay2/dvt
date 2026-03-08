import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type { OutboxWorkerRuntimeLogger } from '../runtime/OutboxWorkerRuntime.js';

import type { OutboxWorkerMonitor } from './OutboxWorkerMonitor.js';

export interface OperationalServerOptions {
  host: string;
  port: number;
  logger: OutboxWorkerRuntimeLogger;
  monitor: OutboxWorkerMonitor;
}

export interface OperationalServerHandle {
  start(): Promise<void>;
  stop(): Promise<void>;
  getAddress(): { host: string; port: number } | null;
}

export function createOperationalServer(
  options: OperationalServerOptions
): OperationalServerHandle {
  let server: Server | null = null;

  return {
    start: async () => {
      if (server !== null) return;

      const candidateServer = createServer((request, response) => {
        void handleRequest(request, response, options.monitor);
      });

      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error): void => {
          candidateServer.off('error', onError);
          reject(error);
        };

        candidateServer.once('error', onError);
        candidateServer.listen(options.port, options.host, () => {
          candidateServer.off('error', onError);
          resolve();
        });
      });
      server = candidateServer;

      options.logger.info(
        { host: options.host, port: options.port },
        'outbox operational server listening'
      );
    },
    stop: async () => {
      if (server === null) return;
      const activeServer = server;
      server = null;
      await new Promise<void>((resolve, reject) => {
        activeServer.close((error) => (error ? reject(error) : resolve()));
      });
      options.logger.info({}, 'outbox operational server stopped');
    },
    getAddress: () => {
      if (server === null) return null;
      const address = server.address();
      if (!address || typeof address === 'string') return null;
      return {
        host: address.address,
        port: address.port,
      };
    },
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  monitor: OutboxWorkerMonitor
): Promise<void> {
  const url = new globalThis.URL(request.url ?? '/', 'http://127.0.0.1');
  const health = monitor.getHealthSnapshot();

  switch (url.pathname) {
    case '/healthz':
      writeJson(response, health.ok ? 200 : 503, {
        ok: health.ok,
        state: health.state,
        service: health.service,
      });
      return;
    case '/readyz':
      writeJson(response, health.ready ? 200 : 503, {
        ok: health.ok,
        ready: health.ready,
        state: health.state,
        service: health.service,
        lastErrorMessage: health.lastErrorMessage,
        lastErrorAt: health.lastErrorAt,
        lastTickAt: health.lastTickAt,
      });
      return;
    case '/metrics':
      response.statusCode = 200;
      response.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
      response.end(monitor.renderMetrics());
      return;
    default:
      writeJson(response, 404, { ok: false, error: 'NOT_FOUND' });
  }
}

function writeJson(
  response: ServerResponse<IncomingMessage>,
  statusCode: number,
  body: unknown
): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}
