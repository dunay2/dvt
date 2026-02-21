#!/usr/bin/env node
/* eslint-env node */
/* global console, process */
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_TARGETS = ['docs', 'packages/@dvt/contracts', 'packages/engine'];

function isIgnored(name) {
  return (
    name === 'node_modules' ||
    name === '.git' ||
    name === 'dist' ||
    name === '.vscode' ||
    name.startsWith('.')
  );
}

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (isIgnored(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function summarizeText(text) {
  // Very small heuristic summary: first paragraph, truncated
  const para = text.split(/\n\s*\n/).find((p) => p.trim().length > 0) || '';
  const s = para.replace(/\s+/g, ' ').trim();
  return s.length > 600 ? s.slice(0, 600) + '...' : s;
}

function tokenEstimate(text) {
  return Math.max(1, Math.round(text.split(/\s+/).length / 0.75));
}

async function genIndexFor(dir) {
  const abs = path.resolve(dir);
  try {
    const stat = await fs.stat(abs);
    if (!stat.isDirectory()) {
      console.warn(`${dir} is not a directory, skipping`);
      return;
    }
  } catch {
    console.warn(`${dir} not found, skipping`);
    return;
  }

  const files = await walk(abs);
  const entries = [];
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!['.md', '.markdown', '.ts', '.js', '.json'].includes(ext)) continue;
    try {
      const txt = await fs.readFile(f, 'utf8');
      const summary = summarizeText(txt);
      const rel = path.relative(abs, f).replace(/\\/g, '/');
      const title = path.basename(f);
      const m = await fs.stat(f);
      entries.push({
        path: rel,
        title,
        summary,
        keywords: [],
        lastUpdated: m.mtime.toISOString(),
        tokenCount: tokenEstimate(summary),
      });
    } catch {
      // skip unreadable
    }
  }

  const out = { generatedAt: new Date().toISOString(), dir: dir, entries };
  const outPath = path.join(abs, 'AI_INDEX.json');
  await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`Wrote ${outPath} (${entries.length} entries)`);
}

async function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : DEFAULT_TARGETS;
  for (const t of targets) {
    await genIndexFor(t);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
