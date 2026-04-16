#!/usr/bin/env node
/**
 * Reused by prebuild/pretypecheck/pretest hooks to skip redundant dependency
 * graph builds when CI already executed an explicit workspace build step.
 */

const value = String(process.env.DVT_CI ?? '')
  .trim()
  .toLowerCase();

process.exit(value === '1' || value === 'true' ? 0 : 1);
