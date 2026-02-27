/**
 * @file packages/@dvt/traceability-service/src/adapters/graph-publisher-neo4j.ts
 * @baseline ADR-0000: Code Generation with Enforced Normative Traceability (Automated)
 * @baseline ADR-0002: Neo4j Knowledge Graph Context Repository
 * @decision Section 4.5 — Publish deterministic ADR/File/Module graph via idempotent MERGE
 * @consequence Re-running publication preserves stable graph state and supports impact analysis queries
 * @version 0.1.0
 * @date 2026-02-21
 */
import neo4j from 'neo4j-driver';
import type { Driver } from 'neo4j-driver';

import type { IAdrCatalog, IGraphPublisher } from '../contracts.js';
import type { HeaderTrace } from '../types.js';

type Neo4jConfig = {
  uri: string;
  user: string;
  password: string;
  database?: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export class Neo4jGraphPublisher implements IGraphPublisher {
  private readonly driver: Driver;
  private readonly database?: string;

  constructor(cfg?: Partial<Neo4jConfig>) {
    const uri = cfg?.uri ?? requiredEnv('NEO4J_URI');
    const user = cfg?.user ?? requiredEnv('NEO4J_USER');
    const password = cfg?.password ?? requiredEnv('NEO4J_PASSWORD');
    const database = cfg?.database ?? process.env['NEO4J_DATABASE'];
    if (database) this.database = database;
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async publish(input: {
    moduleName: string;
    modulePath: string;
    traces: HeaderTrace[];
    adrCatalog: IAdrCatalog;
  }): Promise<void> {
    const session = this.driver.session(this.database ? { database: this.database } : {});
    try {
      for (const t of input.traces) {
        const baselines: Array<{
          number: string;
          title: string | null;
          status: string | null;
          updated: string | null;
          sourcePath: string | null;
        }> = [];
        for (const b of t.baselines) {
          const adr = await input.adrCatalog.getAdr(b.number);
          baselines.push({
            number: b.number,
            title: adr?.title ?? b.title ?? null,
            status: adr?.status ?? null,
            updated: adr?.updated ?? null,
            sourcePath: adr?.sourcePath ?? null,
          });
        }

        await session.executeWrite((tx) =>
          tx.run(
            `
            MERGE (f:File {path: $filePath})
            SET f.kind = $kind,
                f.version = $version,
                f.date = $date,
                f.consequence = $consequence

            MERGE (m:Module {name: $moduleName})
            SET m.path = $modulePath

            MERGE (m)-[:CONTAINS]->(f)

            WITH f
            UNWIND $baselines AS adr
            MERGE (a:ADR {number: adr.number})
            SET a.title = adr.title,
                a.status = adr.status,
                a.updated = adr.updated,
                a.sourcePath = adr.sourcePath
            MERGE (f)-[:BASELINED_ON]->(a)
            `,
            {
              filePath: t.filePath,
              kind: t.kind,
              version: t.version ?? null,
              date: t.date ?? null,
              consequence: t.consequence ?? null,
              moduleName: input.moduleName,
              modulePath: input.modulePath,
              baselines,
            }
          )
        );
      }
    } finally {
      await session.close();
      await this.driver.close();
    }
  }
}
