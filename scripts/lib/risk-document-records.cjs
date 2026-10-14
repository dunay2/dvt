/** Owned concern: decode explicit colocated risk source records without merging their identities. */
const yaml = require('js-yaml');

function extractColocatedRiskRecords(markdown, sourcePath) {
  const lines = markdown.split('\n');
  const records = [];
  let previousRecordEnd = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const opening = lines[index].trimEnd();
    if (!/^`{3,}risk-record/.test(opening)) continue;
    const fence = /^(`{3,4})risk-record-v1$/.exec(opening)?.[1];
    if (!fence) {
      throw new Error(`Unsupported risk record fence in ${sourcePath}:${index + 1}.`);
    }
    const firstLine = index + 1;
    const end = lines.findIndex((line, offset) => offset >= firstLine && line.trimEnd() === fence);
    if (end < 0) throw new Error(`Unclosed risk record in ${sourcePath}:${index + 1}.`);
    const raw = lines.slice(firstLine, end).join('\n') + '\n';
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
    if (!header) throw new Error(`Missing risk record metadata in ${sourcePath}:${index + 1}.`);
    const frontmatter = yaml.load(header[1]);
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      throw new Error(`Invalid risk record metadata in ${sourcePath}:${index + 1}.`);
    }
    for (const field of ['id', 'title', 'status']) {
      if (typeof frontmatter[field] !== 'string' || !frontmatter[field].trim()) {
        throw new Error(`Missing risk record ${field} in ${sourcePath}:${index + 1}.`);
      }
    }
    if (!/^[Rr]-[A-Za-z0-9._-]+$/.test(frontmatter.id)) {
      throw new Error(`Invalid risk record id in ${sourcePath}:${index + 1}.`);
    }
    const sourceFragment = `risk-${frontmatter.id.toLowerCase()}`;
    const anchor = `<a id="${sourceFragment}"></a>`;
    const precedingAnchors = [
      ...lines
        .slice(previousRecordEnd + 1, index)
        .join('\n')
        .matchAll(/<a id="([^"]+)"><\/a>/g),
    ];
    if (markdown.split(anchor).length !== 2 || precedingAnchors.at(-1)?.[1] !== sourceFragment) {
      throw new Error(`Missing or duplicated risk anchor ${sourceFragment} in ${sourcePath}.`);
    }
    records.push({ raw, frontmatter, sourceFragment });
    previousRecordEnd = end;
    index = end;
  }
  return records;
}

module.exports = { extractColocatedRiskRecords };
