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
    filePath: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md',
    out: 'private/neo4j/output/context.json',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--file' && argv[i + 1]) {
      args.filePath = argv[i + 1];
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
  console.log('Usage: node scripts/neo4j/neo4j-query-context.cjs [--file <repo/path>] [--out <file>]');
}

async function run() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const query = `
    MATCH (a:Archivo {path: $filePath})
    OPTIONAL MATCH (m:Modulo)-[:CONTIENE]->(a)
    OPTIONAL MATCH (a)-[:DEPENDE]->(dep:Archivo)
    OPTIONAL MATCH (a)-[:IMPLEMENTA_DECISION]->(d:Decision)
    OPTIONAL MATCH (d)-[:CONSULTO_A]->(p:Persona)
    RETURN a, m, collect(DISTINCT dep) AS dependencias, collect(DISTINCT d) AS decisiones, collect(DISTINCT p) AS personas
  `;

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    const result = await session.run(query, { filePath: args.filePath });

    const rows = result.records.map((record) => ({
      archivo: record.get('a') ? record.get('a').properties : null,
      modulo: record.get('m') ? record.get('m').properties : null,
      dependencias: (record.get('dependencias') || []).map((n) => (n ? n.properties : null)).filter(Boolean),
      decisiones: (record.get('decisiones') || []).map((n) => (n ? n.properties : null)).filter(Boolean),
      personas: (record.get('personas') || []).map((n) => (n ? n.properties : null)).filter(Boolean),
    }));

    const outPath = path.resolve(args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ filePath: args.filePath, results: rows }, null, 2), 'utf-8');

    console.log(`✅ Context query completed. Output: ${args.out}`);
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((error) => {
  console.error('❌ Query failed:', error.message);
  process.exit(1);
});

