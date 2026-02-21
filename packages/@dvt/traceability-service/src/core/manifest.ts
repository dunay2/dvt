import type { IAdrCatalog, IManifestBuilder } from '../contracts.js';
import type { HeaderTrace, TraceabilityManifest } from '../types.js';

export class ManifestBuilder implements IManifestBuilder {
  async build(input: {
    component: string;
    version: string;
    repoSha: string;
    generated: string;
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
  }): Promise<TraceabilityManifest> {
    type BaselineAcc = { title?: string; decisions: Set<string>; files: Set<string> };
    const map = new Map<string, BaselineAcc>();

    for (const t of input.traces) {
      for (const b of t.baselines) {
        const existing =
          map.get(b.number) ??
          ({
            decisions: new Set<string>(),
            files: new Set<string>(),
          } as BaselineAcc);
        const adr = await input.adrCatalog.getAdr(b.number);
        const resolvedTitle = adr?.title ?? b.title ?? existing.title;
        if (resolvedTitle) existing.title = resolvedTitle;
        for (const d of t.decisions) existing.decisions.add(d);
        existing.files.add(t.filePath);
        map.set(b.number, existing);
      }
    }

    const baseline_adrs = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([number, v]) => {
        const item: {
          number: string;
          title?: string;
          decisions: string[];
          implemented_by: string[];
        } = {
          number,
          decisions: Array.from(v.decisions).sort(),
          implemented_by: Array.from(v.files).sort(),
        };
        if (v.title) item.title = v.title;
        return item;
      });

    return {
      component: input.component,
      version: input.version,
      generated: input.generated,
      repo: { sha: input.repoSha },
      baseline_adrs,
    };
  }
}
