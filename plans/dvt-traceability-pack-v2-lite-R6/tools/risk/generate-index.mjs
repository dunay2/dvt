#!/usr/bin/env node
/**
 * Generate docs/risk-register/INDEX.md from per-risk files.
 *
 * Convention:
 *   docs/risk-register/<domain>/R-*.md
 *
 * This is intentionally minimal and uses js-yaml.
 */
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

const root = process.env.RISK_ROOT || "docs/risk-register";
const outPath = path.join(root, "INDEX.md");

function parseFrontMatter(md) {
  if (!md.startsWith("---")) return null;
  const end = md.indexOf("\n---", 3);
  if (end === -1) return null;
  const fmText = md.slice(3, end).trim();
  return yaml.load(fmText);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(p));
    else if (e.isFile() && e.name.startsWith("R-") && e.name.endsWith(".md")) files.push(p);
  }
  return files;
}

if (!fs.existsSync(root)) {
  console.error(`Missing risk root: ${root}`);
  process.exit(2);
}

const riskFiles = walk(root).filter(p => !p.endsWith("INDEX.md"));
const rows = [];

for (const fp of riskFiles) {
  const md = fs.readFileSync(fp, "utf8");
  const fm = parseFrontMatter(md) || {};
  const rel = fp.replace(/\\/g, "/");
  rows.push({
    id: fm.id || path.basename(fp, ".md"),
    domain: fm.domain || rel.split("/")[2] || "unknown",
    severity: fm.severity || "unknown",
    probability: fm.probability || "unknown",
    status: fm.status || "unknown",
    owner: fm.owner || "unknown",
    file: rel,
  });
}

rows.sort((a, b) => (a.domain + a.id).localeCompare(b.domain + b.id));

const header = `# Risk Register Index\n\nGenerated from per-risk files under \`${root}/<domain>/R-*.md\`.\n\n`;
const table = [
  "| ID | Domain | Severity | Probability | Status | Owner | File |",
  "|---|---|---|---|---|---|---|",
  ...rows.map(r => `| ${r.id} | ${r.domain} | ${r.severity} | ${r.probability} | ${r.status} | ${r.owner} | ${r.file} |`)
].join("\n") + "\n";

fs.writeFileSync(outPath, header + table, "utf8");
console.log(`Wrote ${outPath} (${rows.length} risks).`);
