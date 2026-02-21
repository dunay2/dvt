import fs from 'node:fs/promises';
import path from 'node:path';

import { glob } from 'glob';

import type { ITraceHeaderScanner } from '../contracts.js';
import { parseTraceHeader } from '../core/header-parser.js';
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
      if (t) traces.push(t);
    }
    return traces;
  }
}
