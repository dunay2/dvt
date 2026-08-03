'use strict';

const { isDeepStrictEqual } = require('node:util');
const { Client } = require('pg');

function createRuntimeProofPostgresProbe(options) {
  const ClientClass = options.ClientClass ?? Client;
  const schema = quoteIdentifier(options.schema ?? 'dvt');

  const query = async (text, values = []) => {
    const client = new ClientClass({ connectionString: options.connectionString });
    await client.connect();
    try {
      return await client.query(text, values);
    } finally {
      await client.end();
    }
  };

  return {
    countPendingOutbox: async (tenantId) => {
      const result = await query(
        `SELECT COUNT(*)::integer AS count FROM ${schema}.outbox WHERE tenant_id = $1 AND delivered_at IS NULL`,
        [tenantId]
      );
      return result.rows[0]?.count ?? 0;
    },
    readSnapshot: async (tenantId, runId) => {
      const result = await query(
        `SELECT snapshot, last_run_seq, updated_at FROM ${schema}.run_snapshots WHERE tenant_id = $1 AND run_id = $2`,
        [tenantId, runId]
      );
      return result.rows[0] ?? null;
    },
    readEvents: async (tenantId, runId) => {
      const result = await query(
        `SELECT run_seq, event_type, idempotency_key, payload FROM ${schema}.run_events WHERE tenant_id = $1 AND run_id = $2 ORDER BY run_seq`,
        [tenantId, runId]
      );
      return result.rows;
    },
  };
}

function hasContiguousRunSequence(events) {
  return events.every((event, index) => event.run_seq === index + 1);
}

function snapshotsMatch(left, right) {
  return (
    left !== null &&
    right !== null &&
    left.last_run_seq === right.last_run_seq &&
    isDeepStrictEqual(left.snapshot, right.snapshot)
  );
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

module.exports = {
  createRuntimeProofPostgresProbe,
  hasContiguousRunSequence,
  snapshotsMatch,
};
