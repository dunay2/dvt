#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

function parseArgs(argv) {
  const args = {
    roadmapId: 'ROADMAP_MAIN',
    out: 'private/neo4j/output/roadmap-tree.json',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--roadmap' && argv[i + 1]) {
      args.roadmapId = argv[i + 1];
      i += 1;
    } else if (token === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(
    'Usage: node scripts/neo4j/neo4j-query-roadmap-tree.cjs [--roadmap <id>] [--out <file>]'
  );
}

function normalize(value) {
  if (neo4j.isInt(value)) {
    return value.inSafeRange() ? value.toNumber() : value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value && typeof value === 'object') {
    if (value.properties && typeof value.properties === 'object') {
      const props = {};
      for (const [k, v] of Object.entries(value.properties)) props[k] = normalize(v);
      return props;
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
    return out;
  }

  return value;
}

async function run() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const query = `
    MATCH (r:Roadmap {id: $roadmapId})
    OPTIONAL MATCH (r)-[contains:CONTIENE_FASE]->(p:FaseRoadmap)
    OPTIONAL MATCH (p)-[unlock:DESBLOQUEA]->(next:FaseRoadmap)
    OPTIONAL MATCH (p)-[:TRACKED_BY]->(i:Issue)
    OPTIONAL MATCH (p)-[:RELACIONA_ARTEFACTO]->(a:Archivo)
    OPTIONAL MATCH (p)-[:ANCLA_DECISION]->(d:Decision)
    RETURN
      r AS roadmap,
      p AS phase,
      contains.orden AS containsOrder,
      [x IN collect(DISTINCT next.id) WHERE x IS NOT NULL] AS unlocks,
      [x IN collect(DISTINCT i.key) WHERE x IS NOT NULL] AS issues,
      [x IN collect(DISTINCT a.path) WHERE x IS NOT NULL] AS artifacts,
      [x IN collect(DISTINCT d.id) WHERE x IS NOT NULL] AS decisions
    ORDER BY containsOrder
  `;

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    const result = await session.run(query, { roadmapId: args.roadmapId });
    if (!result.records.length) {
      throw new Error(`Roadmap not found: ${args.roadmapId}`);
    }

    const rows = result.records
      .map((record) => ({
        roadmap: normalize(record.get('roadmap')),
        phase: normalize(record.get('phase')),
        containsOrder: normalize(record.get('containsOrder')),
        unlocks: normalize(record.get('unlocks')),
        issues: normalize(record.get('issues')),
        artifacts: normalize(record.get('artifacts')),
        decisions: normalize(record.get('decisions')),
      }))
      .filter((row) => row.phase);

    const payload = {
      roadmapId: args.roadmapId,
      roadmap: rows[0] ? rows[0].roadmap : null,
      phases: rows.map((row) => ({
        ...row.phase,
        orden_contenido: row.containsOrder,
        desbloquea: row.unlocks,
        issues: row.issues,
        artifacts: row.artifacts,
        decisions: row.decisions,
      })),
      summary: {
        phaseCount: rows.length,
        totalIssueLinks: rows.reduce((acc, row) => acc + row.issues.length, 0),
        totalArtifactLinks: rows.reduce((acc, row) => acc + row.artifacts.length, 0),
        totalDecisionLinks: rows.reduce((acc, row) => acc + row.decisions.length, 0),
      },
    };

    const outPath = path.resolve(args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log(`✅ Roadmap tree query completed. Output: ${args.out}`);
    console.log(
      `   Phases=${payload.summary.phaseCount} IssueLinks=${payload.summary.totalIssueLinks} ArtifactLinks=${payload.summary.totalArtifactLinks} DecisionLinks=${payload.summary.totalDecisionLinks}`
    );
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((error) => {
  console.error('❌ Roadmap tree query failed:', error.message);
  process.exit(1);
});

