#!/usr/bin/env node
/**
 * Simple JSON validator for golden paths test runner
 * Usage: node validate-json.js <file>
 */

const fs = require('fs');

function main() {
  const file = process.argv[2];

  if (!file) {
    console.error('Usage: node validate-json.js <file>');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(file, 'utf8');
    JSON.parse(content);
    process.exit(0);
  } catch (error) {
    console.error(`Invalid JSON: ${error.message}`);
    process.exit(1);
  }
}

main();
