#!/usr/bin/env node
/* eslint-env node */
/* global console, process, __dirname */

const fs = require('fs');
const path = require('path');
const {
  SCHEMA_CONSTRAINTS,
  collectGraphRows,
  chunk,
} = require('./neo4j-ingest-repo.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT = path.join(__dirname, 'generated-repo.cypher');

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUTPUT,
    includeReset: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--out' && argv[i + 1]) {
      args.out = path.resolve(REPO_ROOT, argv[i + 1]);
      i += 1;
    } else if (token === '--include-reset') {
      args.includeReset = true;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(
    'Usage: node scripts/neo4j/neo4j-generate-cypher.cjs [--out <repo/path>] [--include-reset]'
  );
}

function cypherValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const str = String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
  return `'${str}'`;
}

function propsToCypher(props) {
  const keys = Object.keys(props);
  if (keys.length === 0) return '{}';
  const pairs = keys.map((k) => `${k}: ${cypherValue(props[k])}`);
  return `{ ${pairs.join(', ')} }`;
}

function buildBatchStatements(rows, size, mapper) {
  const stmts = [];
  for (const c of chunk(rows, size)) {
    for (const row of c) {
      const out = mapper(row);
      if (Array.isArray(out)) stmts.push(...out);
      else if (out) stmts.push(out);
    }
  }
  return stmts;
}

function generateCypher({ includeReset }) {
  const {
    files,
    deps,
    issues,
    adrRows,
    adrIssueRows,
    classRows,
    roadmapNodes,
    phaseNodes,
    phaseLinks,
    phaseIssueRows,
    roadmapStatusRows,
  } = collectGraphRows();
  const lines = [];

  lines.push('// GENERATED FILE - DO NOT EDIT MANUALLY');
  lines.push('// Source: scripts/neo4j/neo4j-generate-cypher.cjs');
  lines.push('// ADR-0002 Phase 2: dynamic KG Cypher generation from repository metadata');
  lines.push('');

  lines.push('// Schema constraints');
  for (const stmt of SCHEMA_CONSTRAINTS) {
    lines.push(`${stmt};`);
  }
  lines.push('');

  if (includeReset) {
    lines.push('// Optional reset block');
    for (const label of ['Archivo', 'Modulo', 'Issue', 'Decision', 'Funcion', 'Persona', 'Roadmap', 'FaseRoadmap']) {
      lines.push(`MATCH (n:${label}) DETACH DELETE n;`);
    }
    lines.push('');
  }

  lines.push('// Modules + files');
  lines.push(...buildBatchStatements(files, 300, (row) => {
    const moduleMatch = `MERGE (m:Modulo ${propsToCypher({ path: row.moduloPath })})`;
    const moduleSet = `SET m += ${propsToCypher({ nombre: row.moduloNombre, lenguaje: row.moduloLenguaje })}`;
    const fileMatch = `MERGE (a:Archivo ${propsToCypher({ path: row.path })})`;
    const fileSet = `SET a += ${propsToCypher({
      nombre: row.nombre,
      tipo: row.tipo,
      bytes: row.bytes,
      topico: row.topico,
    })}`;
    const rel = 'MERGE (m)-[:CONTIENE]->(a)';
    return `${moduleMatch}\n${moduleSet}\n${fileMatch}\n${fileSet}\n${rel};`;
  }));
  lines.push('');

  lines.push('// File dependencies');
  lines.push(...buildBatchStatements(deps, 500, (row) => {
    return `MATCH (src:Archivo ${propsToCypher({ path: row.src })})\nMATCH (dst:Archivo ${propsToCypher({ path: row.dst })})\nMERGE (src)-[:DEPENDE]->(dst);`;
  }));
  lines.push('');

  lines.push('// Class/function definitions');
  lines.push(...buildBatchStatements(classRows, 500, (row) => {
    return `MERGE (f:Funcion ${propsToCypher({ key: row.key })})\nSET f += ${propsToCypher({ nombre: row.nombre, linea_inicio: row.line, path: row.file })}\nWITH f\nMATCH (a:Archivo ${propsToCypher({ path: row.file })})\nMERGE (a)-[:DEFINE]->(f);`;
  }));
  lines.push('');

  lines.push('// Issue references from files');
  lines.push(...buildBatchStatements(issues, 500, (row) => {
    return `MERGE (i:Issue ${propsToCypher({ key: row.key })})\nSET i += ${propsToCypher({ number: row.number, repo: 'dunay2/dvt', url: row.url })}\nWITH i\nMATCH (a:Archivo ${propsToCypher({ path: row.file })})\nMERGE (a)-[:REFERENCIA_ISSUE]->(i);`;
  }));
  lines.push('');

  lines.push('// Roadmap root nodes');
  lines.push(...buildBatchStatements(roadmapNodes, 20, (row) => {
    return `MERGE (r:Roadmap ${propsToCypher({ id: row.id })})\nSET r += ${propsToCypher({ path: row.path, nombre: row.name, topico: row.topico })};`;
  }));
  lines.push('');

  lines.push('// Roadmap phase nodes');
  lines.push(...buildBatchStatements(phaseNodes, 50, (row) => {
    return `MERGE (p:FaseRoadmap ${propsToCypher({ id: row.id })})\nSET p += ${propsToCypher({ numero: row.number, nombre: row.name, orden: row.order, path: row.sourcePath })};`;
  }));
  lines.push('');

  lines.push('// Roadmap containment and unlock links');
  lines.push(...buildBatchStatements(phaseLinks, 100, (row) => {
    if (row.relation === 'DESBLOQUEA') {
      return `MATCH (p1:FaseRoadmap ${propsToCypher({ id: row.roadmapId })})\nMATCH (p2:FaseRoadmap ${propsToCypher({ id: row.phaseId })})\nMERGE (p1)-[rel:DESBLOQUEA]->(p2)\nSET rel += ${propsToCypher({ orden: row.order })};`;
    }

    return `MATCH (r:Roadmap ${propsToCypher({ id: row.roadmapId })})\nMATCH (p:FaseRoadmap ${propsToCypher({ id: row.phaseId })})\nMERGE (r)-[rel:CONTIENE_FASE]->(p)\nSET rel += ${propsToCypher({ orden: row.order })};`;
  }));
  lines.push('');

  lines.push('// Roadmap phase issue tracking');
  lines.push(...buildBatchStatements(phaseIssueRows, 200, (row) => {
    return `MATCH (p:FaseRoadmap ${propsToCypher({ id: row.phaseId })})\nMERGE (i:Issue ${propsToCypher({ key: row.key })})\nSET i += ${propsToCypher({ number: row.number, repo: 'dunay2/dvt', url: row.url })}\nMERGE (p)-[:TRACKED_BY]->(i);`;
  }));
  lines.push('');

  lines.push('// Roadmap phase status from progress metrics');
  lines.push(...buildBatchStatements(roadmapStatusRows, 50, (row) => {
    return `MATCH (p:FaseRoadmap ${propsToCypher({ id: row.phaseId })})\nSET p += ${propsToCypher({ estado: row.status })};`;
  }));
  lines.push('');

  lines.push('// Roadmap source file links to roadmap root');
  lines.push("MATCH (a:Archivo { path: 'ROADMAP.md' })");
  lines.push("MATCH (r:Roadmap { id: 'ROADMAP_MAIN' })");
  lines.push('MERGE (a)-[:IMPLEMENTA_DECISION]->(r);');
  lines.push('');

  lines.push('// ADR decision nodes');
  lines.push(...buildBatchStatements(adrRows, 100, (row) => {
    return `MERGE (d:Decision ${propsToCypher({ id: row.id })})\nSET d += ${propsToCypher({ title: row.title, date: row.date, status: row.status, path: row.path })}\nREMOVE d.titulo, d.fecha, d.estado\nWITH d\nMATCH (a:Archivo ${propsToCypher({ path: row.path })})\nMERGE (a)-[:IMPLEMENTA_DECISION]->(d);`;
  }));
  lines.push('');

  lines.push('// ADR tracked-by issues');
  lines.push(...buildBatchStatements(adrIssueRows, 500, (row) => {
    return `MATCH (d:Decision ${propsToCypher({ id: row.adrId })})\nMERGE (i:Issue ${propsToCypher({ key: row.key })})\nSET i += ${propsToCypher({ number: row.number, repo: 'dunay2/dvt', url: row.url })}\nMERGE (d)-[:TRACKED_BY]->(i);`;
  }));
  lines.push('');

  lines.push('// Derived roadmap phase links to artifacts and decisions');
  lines.push('MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:REFERENCIA_ISSUE]-(a:Archivo)');
  lines.push('MERGE (p)-[:RELACIONA_ARTEFACTO]->(a);');
  lines.push('MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:TRACKED_BY]-(d:Decision)');
  lines.push('MERGE (p)-[:ANCLA_DECISION]->(d);');
  lines.push('');

  lines.push('// End of generated graph script');

  return {
    cypher: `${lines.join('\n')}\n`,
    stats: {
      files: files.length,
      deps: deps.length,
      issues: issues.length,
      roadmaps: roadmapNodes.length,
      phases: phaseNodes.length,
      decisions: adrRows.length,
      decisionIssueLinks: adrIssueRows.length,
      classes: classRows.length,
    },
  };
}

function run() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const { cypher, stats } = generateCypher({ includeReset: args.includeReset });
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, cypher, 'utf8');

  const relOut = path.relative(REPO_ROOT, args.out).replace(/\\/g, '/');
  console.log(`✅ Generated Cypher: ${relOut}`);
  console.log(
    `   Files=${stats.files} Deps=${stats.deps} Classes=${stats.classes} Decisions=${stats.decisions}`
  );
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error('❌ Cypher generation failed:', error.message);
    process.exit(1);
  }
}

module.exports = {
  generateCypher,
  propsToCypher,
  cypherValue,
};

