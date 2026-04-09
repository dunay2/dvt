const fs = require('fs');
const path = require('path');

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function parseCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorCell(cell) {
  return /^:?-{3,}:?$/.test(cell);
}

function formatSeparator(cell, width) {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  const hyphens = '-'.repeat(Math.max(3, width));
  return `${left ? ':' : ''}${hyphens}${right ? ':' : ''}`;
}

function alignTable(lines) {
  const rows = lines.map(parseCells);
  const columnCount = rows[0].length;
  if (!rows.every((row) => row.length === columnCount)) return lines;

  const widths = Array.from({ length: columnCount }, (_, index) => {
    let max = 3;
    for (const row of rows) {
      const cell = row[index];
      if (isSeparatorCell(cell)) continue;
      max = Math.max(max, cell.length);
    }
    return max;
  });

  return rows.map((row) => {
    const formatted = row.map((cell, index) => {
      if (isSeparatorCell(cell)) return formatSeparator(cell, widths[index]);
      return cell.padEnd(widths[index], ' ');
    });
    return `| ${formatted.join(' | ')} |`;
  });
}

function alignFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split(/\r?\n/);
  const next = [];

  for (let i = 0; i < lines.length; ) {
    if (!isTableLine(lines[i])) {
      next.push(lines[i]);
      i += 1;
      continue;
    }

    const block = [];
    while (i < lines.length && isTableLine(lines[i])) {
      block.push(lines[i]);
      i += 1;
    }

    if (block.length >= 2) {
      next.push(...alignTable(block));
    } else {
      next.push(...block);
    }
  }

  const updated = next.join('\n');
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(path.relative(process.cwd(), filePath));
  }
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/align-markdown-tables.cjs <file...>');
  process.exit(1);
}

for (const file of files) {
  alignFile(path.resolve(file));
}
