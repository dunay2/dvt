const yaml = require('js-yaml');

function normalizeText(value) {
  return value === undefined || value === null ? '' : String(value);
}

function cleanJson(value) {
  if (Array.isArray(value)) {
    return value.map(cleanJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, cleanJson(entryValue)])
    );
  }
  return value;
}

function parseLooseFrontmatter(frontmatterText) {
  const parsed = {};
  for (const line of frontmatterText.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (match) {
      parsed[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return parsed;
}

function parseFrontmatter(raw) {
  const lines = normalizeText(raw).split(/\r?\n/);
  if (lines[0] !== '---') {
    return { frontmatter: {}, body: normalizeText(raw) };
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex < 0) {
    return { frontmatter: {}, body: normalizeText(raw) };
  }
  const frontmatterText = lines.slice(1, closingIndex).join('\n');
  let parsed;
  try {
    parsed = yaml.load(frontmatterText);
  } catch {
    parsed = parseLooseFrontmatter(frontmatterText);
  }
  return {
    frontmatter:
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? cleanJson(parsed) : {},
    body: lines.slice(closingIndex + 1).join('\n'),
  };
}

module.exports = { normalizeText, parseFrontmatter };
