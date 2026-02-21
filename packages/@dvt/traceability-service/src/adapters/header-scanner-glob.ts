/**
 * @file packages/@dvt/traceability-service/src/adapters/header-scanner-glob.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @decision Section 4.1 — Scan governed files and parse traceability headers
 * @decision Section 6.1 — Detect missing header cases as explicit validation inputs
 * @consequence Governance checks include both malformed headers and absent headers in governed scope
 * @version 0.1.0
 * @date 2026-02-21
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { glob } from 'glob';

import type { ITraceHeaderScanner } from '../contracts.js';
import { inferKindFromPath, parseTraceHeader } from '../core/header-parser.js';
import type { HeaderTrace } from '../types.js';

export class GlobHeaderScanner implements ITraceHeaderScanner {
  async scan(input: {
    repoRoot: string;
    includeGlobs: string[];
    excludeGlobs: string[];
  }): Promise<HeaderTrace[]> {
    const cwd = path.resolve(input.repoRoot);
    const include = input.includeGlobs.length ? input.includeGlobs : ['**/*.ts'];
    const ignore = input.excludeGlobs;

    const matches = new Set<string>();
    for (const g of include) {
      const files = await glob(g, { cwd, ignore, nodir: true, dot: false });
      for (const f of files) matches.add(f);
    }

    const traces: HeaderTrace[] = [];
    for (const rel of Array.from(matches).sort()) {
      const abs = path.join(cwd, rel);
      const text = await fs.readFile(abs, 'utf-8');
      const t = parseTraceHeader(rel, text);
      if (t) {
        traces.push(t);
        continue;
      }

      traces.push({
        filePath: rel.replace(/\\/g, '/'),
        kind: inferKindFromPath(rel),
        baselines: [],
        decisions: [],
      });
    }
    return traces;
  }
}
