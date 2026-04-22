#!/usr/bin/env node
/**
 * Reused by pretypecheck/pretest hooks to skip redundant dependency graph
 * builds when CI or a top-level orchestrator already owns the graph.
 */

const value = String(process.env.DVT_CI ?? '')
  .trim()
  .toLowerCase();
const turboHash = String(process.env.TURBO_HASH ?? '').trim();

process.exit(value === '1' || value === 'true' || turboHash !== '' ? 0 : 1);
