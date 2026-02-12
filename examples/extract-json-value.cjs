#!/usr/bin/env node
/**
 * Extract values from JSON files
 * Usage: node extract-json-value.js <file> <path.to.value>
 */

const fs = require('fs');

function main() {
  const file = process.argv[2];
  const path = process.argv[3];

  if (!file || !path) {
    console.error('Usage: node extract-json-value.js <file> <path.to.value>');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(content);

    // Navigate the path (e.g. "schemaVersion" or "nested.value")
    const keys = path.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.error(`Path not found: ${path}`);
        process.exit(1);
      }
    }

    console.log(value);
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
