import fs from 'node:fs/promises';
import path from 'node:path';

import type { IAdrCatalog } from '../contracts.js';
import type { AdrRef, AdrStatus } from '../types.js';

type AdrCatalogConfig = {
  adrDir: string; // e.g. "docs/adr"
  pattern: RegExp; // e.g. /^ADR-\d+\.md$/
};

function parseFrontMatter(md: string): {
  status?: AdrStatus;
  title?: string;
  date?: string;
  updated?: string;
} {
  // Minimal parser: looks for "Status:" and first H1 title line.
  const lines = md.split(/\r?\n/);
  let title: string | undefined;
  for (const l of lines) {
    if (l.startsWith('# ')) {
      title = l.replace(/^#\s+/, '').trim();
      break;
    }
  }

  const statusLine = lines.find(
    (l) => /^-?\s*\*\*Status\*\*:\s*/i.test(l) || /^Status:\s*/i.test(l)
  );
  const status = statusLine
    ? (statusLine.split(':').slice(1).join(':').trim().replace(/\s+/g, ' ') as AdrStatus)
    : undefined;

  const dateLine = lines.find((l) => /^-?\s*\*\*Date\*\*:\s*/i.test(l) || /^Date:\s*/i.test(l));
  const date = dateLine ? dateLine.split(':').slice(1).join(':').trim() : undefined;

  const updatedLine = lines.find(
    (l) => /^-?\s*\*\*Updated\*\*:\s*/i.test(l) || /^Updated:\s*/i.test(l)
  );
  const updated = updatedLine ? updatedLine.split(':').slice(1).join(':').trim() : undefined;

  const meta: { status?: AdrStatus; title?: string; date?: string; updated?: string } = {};
  if (status) meta.status = status;
  if (title) meta.title = title;
  if (date) meta.date = date;
  if (updated) meta.updated = updated;
  return meta;
}

export class FileSystemAdrCatalog implements IAdrCatalog {
  constructor(private readonly cfg: AdrCatalogConfig) {}

  async getAdr(number: string): Promise<AdrRef | null> {
    const file = `${number}.md`;
    const p = path.join(this.cfg.adrDir, file);
    try {
      const md = await fs.readFile(p, 'utf-8');
      const meta = parseFrontMatter(md);
      const adr: AdrRef = {
        number,
        sourcePath: p.replace(/\\/g, '/'),
      };
      if (meta.title) adr.title = meta.title;
      if (meta.status) adr.status = meta.status;
      const updated = meta.updated ?? meta.date;
      if (updated) adr.updated = updated;
      return adr;
    } catch {
      return null;
    }
  }

  async listAdrs(status?: AdrStatus): Promise<AdrRef[]> {
    const entries = await fs.readdir(this.cfg.adrDir, { withFileTypes: true });
    const adrs: AdrRef[] = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!this.cfg.pattern.test(e.name)) continue;
      const number = e.name.replace(/\.md$/, '');
      const adr = await this.getAdr(number);
      if (!adr) continue;
      if (status && adr.status !== status) continue;
      adrs.push(adr);
    }
    return adrs;
  }
}
