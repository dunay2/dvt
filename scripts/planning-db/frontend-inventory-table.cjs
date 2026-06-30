function normalizeCell(value) {
  return String(value ?? '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function markdownCells(line) {
  let text = String(line ?? '').trim();
  if (text.startsWith('|')) {
    text = text.slice(1);
  }
  if (text.endsWith('|')) {
    text = text.slice(0, -1);
  }
  return text.split('|').map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function normalizeHeader(value) {
  return normalizeCell(value).toLowerCase();
}

function headerIndexes(cells, requiredHeaders) {
  const byHeader = new Map();
  cells.forEach((cell, index) => {
    byHeader.set(normalizeHeader(cell), index);
  });

  for (const header of requiredHeaders) {
    if (!byHeader.has(normalizeHeader(header))) {
      return null;
    }
  }

  return Object.fromEntries(
    requiredHeaders.map((header) => [header, byHeader.get(normalizeHeader(header))])
  );
}

function rowValue(cells, indexes, header) {
  return normalizeCell(cells[indexes[header]]);
}

function rawRow(cells, indexes, headers) {
  return Object.fromEntries(
    headers.map((header) => [header, normalizeCell(cells[indexes[header]])])
  );
}

function countField(row, snakeName, camelName) {
  const explicit = row[snakeName];
  if (explicit !== undefined && explicit !== null) {
    return Number(explicit);
  }

  const arrayValue = row[camelName];
  return Array.isArray(arrayValue) ? arrayValue.length : 0;
}

module.exports = {
  countField,
  headerIndexes,
  isSeparatorRow,
  markdownCells,
  normalizeCell,
  rawRow,
  rowValue,
};
