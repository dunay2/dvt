#!/usr/bin/env node
const fs = require('node:fs');

function currentUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseExistingLastReviewed(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const raw = fs.readFileSync(absPath, 'utf8');
  const match = raw.match(/^last_reviewed:\s*(\d{4}-\d{2}-\d{2})$/m);
  return match ? match[1] : null;
}

function resolveGeneratedDate(absPath, renderWithDate) {
  const forcedDate = process.env.DOCS_STATUS_DATE;
  if (forcedDate) return forcedDate;

  const existingDate = parseExistingLastReviewed(absPath);
  if (!existingDate) return currentUtcDate();

  const current = fs.readFileSync(absPath, 'utf8');
  if (current === renderWithDate(existingDate)) {
    return existingDate;
  }

  return currentUtcDate();
}

module.exports = {
  currentUtcDate,
  resolveGeneratedDate,
};
