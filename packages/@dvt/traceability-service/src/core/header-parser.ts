/**
 * @file packages/@dvt/traceability-service/src/core/header-parser.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.1 — Parse machine-readable in-code traceability headers
 * @decision Section 4.3 — Normalize extracted header metadata for manifest and validation pipelines
 * @consequence Header parsing remains deterministic and portable across governed modules
 * @version 0.1.0
 * @date 2026-02-21
 */
import type { AdrRef, GovernedKind, HeaderTrace } from '../types.js';

const BASELINE_RE = /@baseline\s+(ADR-\d+)(?::\s*([^\n*]+))?/g;
const DECISION_RE = /@decision\s+([^\n*]+)/g;
const CONSEQUENCE_RE = /@consequence\s+([^\n*]+)/;
const VERSION_RE = /@version\s+([^\n*]+)/;
const DATE_RE = /@date\s+([^\n*]+)/;

export function inferKindFromPath(filePath: string): GovernedKind {
  if (filePath.endsWith('.test.ts') || filePath.endsWith('.contract.ts')) return 'test';
  if (filePath.endsWith('.md')) return 'doc';
  if (filePath.endsWith('.json')) return 'schema';
  return 'code';
}

export function parseTraceHeader(filePath: string, fileText: string): HeaderTrace | null {
  // Expect a leading block comment containing @baseline.
  const head = fileText.slice(0, 4000); // limit scan
  const commentStart = head.indexOf('/**');
  if (commentStart < 0) return null;
  const commentEnd = head.indexOf('*/', commentStart);
  if (commentEnd < 0) return null;

  const block = head.slice(commentStart, commentEnd + 2);
  const baselines: AdrRef[] = [];
  let m: RegExpExecArray | null;
  while ((m = BASELINE_RE.exec(block)) !== null) {
    const number = m[1];
    if (!number) continue;
    const title = (m[2] ?? '').trim();
    const adr: AdrRef = { number };
    if (title.length) adr.title = title;
    baselines.push(adr);
  }
  const decisions: string[] = [];
  while ((m = DECISION_RE.exec(block)) !== null) {
    const decision = m[1]?.trim();
    if (decision) decisions.push(decision);
  }
  const consequence = CONSEQUENCE_RE.exec(block)?.[1]?.trim();
  const version = VERSION_RE.exec(block)?.[1]?.trim();
  const date = DATE_RE.exec(block)?.[1]?.trim();

  if (baselines.length === 0) return null;

  const rel = filePath.replace(/\\/g, '/');
  const trace: HeaderTrace = {
    filePath: rel,
    kind: inferKindFromPath(rel),
    baselines,
    decisions,
    baselineRaw: block,
  };
  if (consequence) trace.consequence = consequence;
  if (version) trace.version = version;
  if (date) trace.date = date;
  return trace;
}

export function resolveModuleFromPath(filePath: string): {
  moduleName: string;
  modulePath: string;
} {
  // heuristic: packages/@dvt/<name>/...
  const norm = filePath.replace(/\\/g, '/');
  const idx = norm.indexOf('packages/');
  if (idx < 0) return { moduleName: 'unknown', modulePath: '' };
  const parts = norm.slice(idx).split('/');
  // packages, @dvt, engine, ...
  if (parts.length >= 3) {
    const modulePath = parts.slice(0, 3).join('/');
    const moduleName = parts[1] && parts[2] ? `${parts[1]}/${parts[2]}` : 'unknown';
    return { moduleName, modulePath };
  }
  return { moduleName: 'unknown', modulePath: '' };
}
