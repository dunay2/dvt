/**
 * Owned concern: establish private POSIX creation in an explicitly selected Node bootstrap.
 * Invoke with --require before the server or test runner loads application code.
 * Never import this module from an application operation or a runtime session.
 * Workers inherit the process mask; they must not set it from another thread.
 * This does not enable LOCAL or validate existing files or Windows ACLs.
 */
'use strict';

const { isMainThread } = require('node:worker_threads');

if (process.platform !== 'win32' && isMainThread) {
  process.umask(0o077);
}
