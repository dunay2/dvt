/**
 * @file packages/@dvt/traceability-service/src/adapters/adr-catalog-filesystem.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.4 — Resolve and validate Accepted ADR catalog from docs filesystem
 * @consequence Traceability validation uses canonical ADR metadata independent of filename suffix variations
 * @version 0.1.0
 * @date 2026-02-21
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import type { IAdrCatalog } from '../contracts.js';
import type { AdrRef, AdrStatus } from '../types.js';

type AdrCatalogConfig = {
  adrDir: string; // e.g. "docs/adr"
  pattern: RegExp; // e.g. /^ADR-\d+\.md$/
};

const ADR_NUMBER_RE = /(ADR-\d+)/i;

function extractAdrNumber(fileName: string): string | null {
  const match = fileName.match(ADR_NUMBER_RE);
  if (!match?.[1]) return null;
  return match[1].toUpperCase();
}

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
    (l) => /^-?\s*\*\*Status\*\*:\s*/i.test(l) || /^-?\s*Status:\s*/i.test(l)
  );
  const status = statusLine
    ? (statusLine.split(':').slice(1).join(':').trim().replace(/\s+/g, ' ') as AdrStatus)
    : undefined;

  const dateLine = lines.find(
    (l) => /^-?\s*\*\*Date\*\*:\s*/i.test(l) || /^-?\s*Date:\s*/i.test(l)
  );
  const date = dateLine ? dateLine.split(':').slice(1).join(':').trim() : undefined;

  const updatedLine = lines.find(
    (l) => /^-?\s*\*\*Updated\*\*:\s*/i.test(l) || /^-?\s*Updated:\s*/i.test(l)
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

  private async resolveAdrPath(number: string): Promise<string | null> {
    const normalized = number.toUpperCase();
    const direct = path.join(this.cfg.adrDir, `${normalized}.md`);
    try {
      await fs.access(direct);
      return direct;
    } catch {
      // fallback to pattern-based lookup for repos that suffix ADR filenames.
    }

    const entries = await fs.readdir(this.cfg.adrDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!this.cfg.pattern.test(e.name)) continue;
      const fileNumber = extractAdrNumber(e.name);
      if (!fileNumber) continue;
      if (fileNumber === normalized) {
        return path.join(this.cfg.adrDir, e.name);
      }
    }
    return null;
  }

  async getAdr(number: string): Promise<AdrRef | null> {
    const p = await this.resolveAdrPath(number);
    if (!p) return null;
    try {
      const md = await fs.readFile(p, 'utf-8');
      const meta = parseFrontMatter(md);
      const adr: AdrRef = {
        number: number.toUpperCase(),
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
      const number = extractAdrNumber(e.name);
      if (!number) continue;
      const adr = await this.getAdr(number);
      if (!adr) continue;
      if (status && adr.status !== status) continue;
      adrs.push(adr);
    }
    return adrs;
  }
}
