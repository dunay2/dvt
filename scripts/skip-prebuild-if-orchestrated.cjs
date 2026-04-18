#!/usr/bin/env node
/**
 * Reused by prebuild hooks to skip redundant dependency graph builds when
 * either CI already ran an explicit graph build or Turborepo already owns the
 * current build task.
 */

const dvtCi = String(process.env.DVT_CI ?? '')
  .trim()
  .toLowerCase();
const turboHash = String(process.env.TURBO_HASH ?? '').trim();

process.exit(dvtCi === '1' || dvtCi === 'true' || turboHash !== '' ? 0 : 1);
