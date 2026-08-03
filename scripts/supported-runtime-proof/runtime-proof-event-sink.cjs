'use strict';

const { createServer } = require('node:http');

async function startRuntimeProofEventSink(options = {}) {
  const deliveries = [];
  const deliveryCounts = new Map();
  const server = createServer((request, response) => {
    void handleDelivery(request, response, options.bearerToken, deliveries, deliveryCounts);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, options.host ?? '127.0.0.1', resolve);
  });

  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Runtime proof event sink did not expose a TCP address');
  }

  return {
    targetUrl: `http://${options.host ?? '127.0.0.1'}:${address.port}/events`,
    snapshot: () => ({
      deliveries: [...deliveries],
      duplicateDeliveryCount: [...deliveryCounts.values()].reduce(
        (count, occurrences) => count + Math.max(0, occurrences - 1),
        0
      ),
    }),
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      ),
  };
}

async function handleDelivery(request, response, bearerToken, deliveries, deliveryCounts) {
  if (request.method !== 'POST' || request.url !== '/events') {
    writeJson(response, 404, { ok: false });
    return;
  }
  if (bearerToken !== undefined && request.headers.authorization !== `Bearer ${bearerToken}`) {
    writeJson(response, 401, { ok: false });
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    if (!Array.isArray(body.events)) {
      writeJson(response, 400, { ok: false });
      return;
    }

    for (const event of body.events) {
      if (typeof event?.idempotencyKey !== 'string' || event.idempotencyKey.length === 0) {
        writeJson(response, 400, { ok: false });
        return;
      }
      deliveries.push(event);
      deliveryCounts.set(event.idempotencyKey, (deliveryCounts.get(event.idempotencyKey) ?? 0) + 1);
    }
    writeJson(response, 202, { accepted: body.events.length });
  } catch {
    writeJson(response, 400, { ok: false });
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) {
        reject(new Error('Runtime proof event sink payload exceeds 10 MiB'));
        request.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

function writeJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

module.exports = { startRuntimeProofEventSink };
