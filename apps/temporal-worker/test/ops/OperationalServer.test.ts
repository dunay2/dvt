import { request } from 'node:http';

import { afterEach, describe, expect, it } from 'vitest';

import { createOperationalServer } from '../../src/ops/OperationalServer.js';
import { TemporalWorkerMonitor } from '../../src/ops/TemporalWorkerMonitor.js';

describe('TemporalWorker OperationalServer', () => {
  const servers: Array<ReturnType<typeof createOperationalServer>> = [];

  afterEach(async () => {
    await Promise.all(servers.map((server) => server.stop()));
    servers.length = 0;
  });

  it('serves healthz, readyz and metrics', async () => {
    const monitor = new TemporalWorkerMonitor({
      serviceName: 'dvt-temporal-worker',
      logger: { info() {}, error() {} },
      dbtEnabled: true,
    });
    monitor.onStarting();
    monitor.onStarted();

    const server = createOperationalServer({
      host: '127.0.0.1',
      port: 0,
      logger: { info() {} },
      monitor,
    });
    servers.push(server);
    await server.start();
    const address = server.getAddress();
    if (address === null) {
      throw new Error('server address unavailable');
    }

    const healthz = await httpGet(address.port, '/healthz');
    const readyz = await httpGet(address.port, '/readyz');
    const metrics = await httpGet(address.port, '/metrics');

    expect(healthz.statusCode).toBe(200);
    expect(JSON.parse(healthz.body)).toMatchObject({ ok: true, dbtEnabled: true });
    expect(readyz.statusCode).toBe(200);
    expect(JSON.parse(readyz.body)).toMatchObject({ ready: true });
    expect(metrics.body).toContain('dvt_temporal_worker_ready 1');
  });
});

function httpGet(port: number, path: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}
