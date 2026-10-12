'use strict';

/** Owns the exact PostgreSQL database lifecycle of one live proof invocation. */
const { randomBytes } = require('node:crypto');
const { Client } = require('pg');

function validateAdminUrl(adminUrl) {
  const parsed = new URL(adminUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('Disposable proof requires a PostgreSQL admin URL');
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname.toLowerCase())) {
    throw new Error('Disposable proof database requires a loopback PostgreSQL host');
  }
  if (!decodeURIComponent(parsed.pathname.slice(1))) {
    throw new Error('Disposable proof admin URL requires a database name');
  }
  return parsed;
}

async function allocateDisposablePostgresDatabase(adminUrl, label, options = {}) {
  if (!/^[a-z][a-z0-9_]{0,19}$/.test(label)) {
    throw new Error(
      'Disposable proof database label must be bounded lowercase SQL identifier text'
    );
  }
  const parsed = validateAdminUrl(adminUrl);
  const name = `dvt_proof_${label}_${randomBytes(8).toString('hex')}`;
  const clientFactory =
    options.clientFactory ?? ((connectionString) => new Client({ connectionString }));

  const admin = clientFactory(adminUrl);
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }

  parsed.pathname = `/${name}`;
  let disposal;
  return {
    name,
    url: parsed.href,
    dispose() {
      disposal ??= (async () => {
        const cleanup = clientFactory(adminUrl);
        await cleanup.connect();
        try {
          await cleanup.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        } finally {
          await cleanup.end();
        }
      })();
      return disposal;
    },
  };
}

function installDisposablePostgresInterruptCleanup(lease, shutdown, processRef = process) {
  let interrupted = false;
  const onSignal = (signal, exitCode) => {
    if (interrupted) return;
    interrupted = true;
    remove();
    void (async () => {
      let failure;
      try {
        await shutdown();
      } catch (error) {
        failure = error;
      }
      try {
        await lease.dispose();
      } catch (error) {
        failure ??= error;
      }
      if (failure) console.error(`[disposable-postgres] ${signal} cleanup failed:`, failure);
      processRef.exit(failure ? 1 : exitCode);
      processRef.emit('disposable-cleanup-complete');
    })();
  };
  const onSigint = () => onSignal('SIGINT', 130);
  const onSigterm = () => onSignal('SIGTERM', 143);
  const remove = () => {
    processRef.off('SIGINT', onSigint);
    processRef.off('SIGTERM', onSigterm);
  };
  processRef.on('SIGINT', onSigint);
  processRef.on('SIGTERM', onSigterm);
  return remove;
}

module.exports = {
  allocateDisposablePostgresDatabase,
  installDisposablePostgresInterruptCleanup,
};
