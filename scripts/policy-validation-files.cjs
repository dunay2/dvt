const fs = require('fs');
const path = require('path');

const CONTRACTS_ROOT = path.resolve(__dirname, '../docs/architecture/components/engine/contracts');

function requireContractMarkdownFiles(files) {
  if (files.length === 0) throw new Error('CONTRACT_CORPUS | no Markdown files in required corpus');
  return files;
}

function listMarkdownFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

module.exports = {
  CONTRACTS_ROOT,
  listMarkdownFiles,
  requireContractMarkdownFiles,
};
