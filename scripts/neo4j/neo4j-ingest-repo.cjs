#!/usr/bin/env node
/* eslint-env node */
/* global console, process, __dirname, Buffer */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const neo4j = require('neo4j-driver');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';
const KG_RESET = (process.env.KG_RESET || 'true').toLowerCase() === 'true';

function runGitList() {
  const out = execSync('git ls-files', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    shell: true,
  });
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function listAdrFilesFromFs() {
  const decisionsDir = path.join(REPO_ROOT, 'docs', 'decisions');
  if (!fs.existsSync(decisionsDir)) return [];

  return fs
    .readdirSync(decisionsDir)
    .filter((name) => /^ADR-\d+.*\.md$/i.test(name))
    .map((name) => `docs/decisions/${name}`.replace(/\\/g, '/'));
}

function fileType(filePath) {
  const ext = path.posix.extname(filePath).toLowerCase();
  if (['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'].includes(ext)) return 'code';
  if (['.md', '.mdx'].includes(ext)) return 'doc';
  if (['.json', '.yml', '.yaml', '.toml', '.ini'].includes(ext)) return 'config';
  if (['.sh', '.ps1', '.bat'].includes(ext)) return 'script';
  return 'other';
}

function moduloPathFor(filePath) {
  const parts = filePath.split('/');
  if (parts[0] === 'packages' && parts[1]) return `packages/${parts[1]}`;
  if (parts[0] === 'docs' && parts[1]) return `docs/${parts[1]}`;
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function moduloLanguageFor(filePath) {
  const ext = path.posix.extname(filePath).toLowerCase();
  if (['.ts', '.tsx'].includes(ext)) return 'typescript';
  if (['.js', '.jsx', '.cjs', '.mjs'].includes(ext)) return 'javascript';
  if (['.md', '.mdx'].includes(ext)) return 'markdown';
  if (ext === '.json') return 'json';
  if (['.yml', '.yaml'].includes(ext)) return 'yaml';
  return 'text';
}

function resolveRelativeImport(sourceFile, importLiteral, fileSet) {
  if (!importLiteral.startsWith('.')) return null;

  const sourceDir = path.posix.dirname(sourceFile);
  const base = path.posix.normalize(path.posix.join(sourceDir, importLiteral));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}.json`,
    `${base}.md`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.mjs`,
    `${base}/index.cjs`,
  ];

  for (const c of candidates) {
    if (fileSet.has(c)) return c;
  }
  return null;
}

function parseImports(filePath, content, fileSet) {
  const deps = new Set();
  const patterns = [
    /import\s+[^'"\n]+\s+from\s+['"]([^'"]+)['"]/g,
    /export\s+[^'"\n]+\s+from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const regex of patterns) {
    let m;
    while ((m = regex.exec(content)) !== null) {
      const resolved = resolveRelativeImport(filePath, m[1], fileSet);
      if (resolved && resolved !== filePath) deps.add(resolved);
    }
  }
  return Array.from(deps);
}

function parseIssueRefs(content) {
  const issueNumbers = new Set();

  const urlRegex = /https?:\/\/github\.com\/dunay2\/dvt\/issues\/(\d+)/g;
  let u;
  while ((u = urlRegex.exec(content)) !== null) issueNumbers.add(Number(u[1]));

  const hashRegex = /(^|[^A-Za-z0-9_])#(\d{1,5})\b/gm;
  let h;
  while ((h = hashRegex.exec(content)) !== null) issueNumbers.add(Number(h[2]));

  return Array.from(issueNumbers).sort((a, b) => a - b);
}

function normalizeDecisionStatus(value) {
  if (!value) return null;

  const raw = value.trim().toLowerCase();
  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[`*_]/g, '')
    .replace(/[\s-]+/g, ' ')
    .trim();

  const map = new Map([
    ['accepted', 'Accepted'],
    ['aceptado', 'Accepted'],
    ['aprobado', 'Accepted'],
    ['approved', 'Accepted'],
    ['proposed', 'Proposed'],
    ['propuesto', 'Proposed'],
    ['draft', 'Draft'],
    ['borrador', 'Draft'],
    ['rejected', 'Rejected'],
    ['rechazado', 'Rejected'],
    ['deprecated', 'Deprecated'],
    ['deprecado', 'Deprecated'],
    ['obsoleto', 'Deprecated'],
    ['superseded', 'Superseded'],
    ['sustituido', 'Superseded'],
    ['replaced', 'Superseded'],
  ]);

  if (map.has(cleaned)) return map.get(cleaned);

  const normalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return normalized;
}

function parseAdr(filePath, content) {
  if (!/^docs\/decisions\/ADR-\d+/i.test(filePath)) return null;

  const filename = path.posix.basename(filePath, '.md');
  const id = filename.match(/ADR-\d+/i)?.[0]?.toUpperCase() || filename.toUpperCase();

  const titleMatch = content.match(/^#\s+(.+)$/m) || content.match(/^\s*(ADR-\d+\s*:\s*.+)\s*$/im);
  const estadoMatch =
    content.match(/-\s+\*\*(Estado|Status)\*\*:\s*(.+)$/im) ||
    content.match(/^\s*(Estado|Status)\s*:\s*(.+)$/im);
  const fechaMatch =
    content.match(/-\s+\*\*(Fecha|Date)\*\*:\s*(.+)$/im) ||
    content.match(/^\s*(Fecha|Date)\s*:\s*(.+)$/im);

  return {
    id,
    path: filePath,
    title: titleMatch ? titleMatch[1].trim() : id,
    status: normalizeDecisionStatus(estadoMatch ? estadoMatch[2] : null),
    date: fechaMatch ? fechaMatch[2].trim() : null,
  };
}

function parseClassDefs(filePath, content) {
  const rows = [];
  const regex = /^\s*export\s+class\s+([A-Za-z0-9_]+)/gm;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const name = m[1];
    const line = content.slice(0, m.index).split('\n').length;
    rows.push({
      key: `${filePath}::${name}`,
      nombre: name,
      line,
      file: filePath,
    });
  }
  return rows;
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function safeNodeId(value) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function parseRoadmapPhases(content) {
  const lines = content.split('\n');
  const phases = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^##\s+.*?Phase\s+([0-9]+(?:\.[0-9]+)?)\s*:\s*(.+?)\s*(?:\(.*\))?\s*$/i);
    if (!match) continue;

    const phaseNumber = match[1];
    const phaseName = match[2].trim();
    const phaseId = `PHASE_${safeNodeId(phaseNumber)}`;

    let sectionEnd = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^##\s+/.test(lines[j])) {
        sectionEnd = j;
        break;
      }
    }

    const sectionText = lines.slice(i, sectionEnd).join('\n');
    const issueRegex = /\[#(\d+)\]\((https?:\/\/github\.com\/[^)]+\/issues\/\d+)\)/g;
    const issueRows = [];
    let issueMatch;
    while ((issueMatch = issueRegex.exec(sectionText)) !== null) {
      issueRows.push({
        issueNumber: Number(issueMatch[1]),
        issueUrl: issueMatch[2],
      });
    }

    phases.push({
      id: phaseId,
      number: phaseNumber,
      name: phaseName,
      order: phases.length + 1,
      sourcePath: 'ROADMAP.md',
      issueRows,
    });
  }

  for (let i = 0; i < phases.length; i += 1) {
    const current = phases[i];
    const next = phases[i + 1];
    current.nextPhaseId = next ? next.id : null;
  }

  return phases;
}

function parseRoadmapStatusRows(content) {
  const rows = [];
  const lines = content.split('\n');

  let inMetrics = false;
  let currentPhaseId = null;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');

    if (/^##\s+.*(Progress Metrics|M[eé]tricas? de progreso)/i.test(line)) {
      inMetrics = true;
      currentPhaseId = null;
      continue;
    }

    if (
      inMetrics &&
      /^##\s+/.test(line) &&
      !/^##\s+.*(Progress Metrics|M[eé]tricas? de progreso)/i.test(line)
    ) {
      break;
    }

    if (!inMetrics) continue;

    if (/^###\s+/.test(line) && !/^###\s+.*?Phase\s+([0-9]+(?:\.[0-9]+)?)/i.test(line)) {
      currentPhaseId = null;
      continue;
    }

    const phaseMatch = line.match(/^###\s+.*?Phase\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (phaseMatch) {
      currentPhaseId = `PHASE_${safeNodeId(phaseMatch[1])}`;
      continue;
    }

    const statusMatch = line.match(/^\s*-\s+\*\*(?:Status|Estado)\*\*:\s+(.+?)\s*$/i);
    if (statusMatch && currentPhaseId) {
      rows.push({
        phaseId: currentPhaseId,
        status: statusMatch[1].trim(),
        sourcePath: 'ROADMAP.md',
      });
    }
  }

  return rows;
}

function collectRoadmapRows() {
  const roadmapPath = path.join(REPO_ROOT, 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    return {
      roadmapNodes: [],
      phaseNodes: [],
      phaseLinks: [],
      phaseIssueRows: [],
      roadmapStatusRows: [],
    };
  }

  const content = fs.readFileSync(roadmapPath, 'utf8');
  const phaseNodes = parseRoadmapPhases(content);
  const roadmapStatusRows = parseRoadmapStatusRows(content);

  const roadmapNodes = [
    {
      id: 'ROADMAP_MAIN',
      path: 'ROADMAP.md',
      name: 'DVT Engine Roadmap',
      topico: 'roadmap',
    },
  ];

  const phaseLinks = [];
  const phaseIssueRows = [];
  for (const phase of phaseNodes) {
    phaseLinks.push({
      roadmapId: 'ROADMAP_MAIN',
      phaseId: phase.id,
      order: phase.order,
    });

    if (phase.nextPhaseId) {
      phaseLinks.push({
        roadmapId: phase.id,
        phaseId: phase.nextPhaseId,
        order: phase.order + 100,
        relation: 'DESBLOQUEA',
      });
    }

    for (const issue of phase.issueRows) {
      phaseIssueRows.push({
        phaseId: phase.id,
        key: `dunay2/dvt#${issue.issueNumber}`,
        number: issue.issueNumber,
        url: issue.issueUrl,
      });
    }
  }

  return {
    roadmapNodes,
    phaseNodes,
    phaseLinks,
    phaseIssueRows,
    roadmapStatusRows,
  };
}

const SCHEMA_CONSTRAINTS = [
  'CREATE CONSTRAINT modulo_path_unique IF NOT EXISTS FOR (m:Modulo) REQUIRE m.path IS UNIQUE',
  'CREATE CONSTRAINT archivo_path_unique IF NOT EXISTS FOR (a:Archivo) REQUIRE a.path IS UNIQUE',
  'CREATE CONSTRAINT issue_key_unique IF NOT EXISTS FOR (i:Issue) REQUIRE i.key IS UNIQUE',
  'CREATE CONSTRAINT decision_id_unique IF NOT EXISTS FOR (d:Decision) REQUIRE d.id IS UNIQUE',
  'CREATE CONSTRAINT funcion_key_unique IF NOT EXISTS FOR (f:Funcion) REQUIRE f.key IS UNIQUE',
  'CREATE CONSTRAINT roadmap_id_unique IF NOT EXISTS FOR (r:Roadmap) REQUIRE r.id IS UNIQUE',
  'CREATE CONSTRAINT fase_roadmap_id_unique IF NOT EXISTS FOR (p:FaseRoadmap) REQUIRE p.id IS UNIQUE',
];

async function ensureSchema(session) {
  for (const stmt of SCHEMA_CONSTRAINTS) {
    await session.run(stmt);
  }
}

async function resetGraph(session) {
  const labels = ['Archivo', 'Modulo', 'Issue', 'Decision', 'Funcion', 'Persona', 'Roadmap', 'FaseRoadmap'];
  for (const label of labels) {
    await session.run(`MATCH (n:${label}) DETACH DELETE n`);
  }
}

function collectGraphRows() {
  const trackedFiles = Array.from(new Set([...runGitList(), ...listAdrFilesFromFs()])).sort();
  const fileSet = new Set(trackedFiles);

  const files = [];
  const deps = [];
  const issues = [];
  const adrRows = [];
  const adrIssueRows = [];
  const classRows = [];
  const {
    roadmapNodes,
    phaseNodes,
    phaseLinks,
    phaseIssueRows,
    roadmapStatusRows,
  } = collectRoadmapRows();

  for (const relPath of trackedFiles) {
    const abs = path.join(REPO_ROOT, relPath);
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch {
      continue;
    }

    if (!stat.isFile()) continue;

    const relPosix = relPath.replace(/\\/g, '/');
    const ext = path.posix.extname(relPosix).toLowerCase();
    const isText = [
      '.md',
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.cjs',
      '.mjs',
      '.json',
      '.yml',
      '.yaml',
      '.sh',
      '.ps1',
      '.txt',
      '.d.ts',
    ].some((t) => relPosix.endsWith(t));

    let content = null;
    let normalizedBytes = stat.size;
    if (isText && stat.size <= 1024 * 1024 * 2) {
      content = fs.readFileSync(abs, 'utf8');
      normalizedBytes = Buffer.byteLength(content.replace(/\r\n/g, '\n'), 'utf8');
    }

    files.push({
      path: relPosix,
      nombre: path.posix.basename(relPosix),
      tipo: ext.replace('.', '') || 'none',
      bytes: normalizedBytes,
      topico: fileType(relPosix),
      moduloPath: moduloPathFor(relPosix),
      moduloNombre: path.posix.basename(moduloPathFor(relPosix)),
      moduloLenguaje: moduloLanguageFor(relPosix),
    });

    if (!content) continue;

    if (['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'].includes(ext)) {
      const d = parseImports(relPosix, content, fileSet);
      for (const dst of d) deps.push({ src: relPosix, dst });
      classRows.push(...parseClassDefs(relPosix, content));
    }

    const issueNums = parseIssueRefs(content);
    for (const n of issueNums) {
      const key = `dunay2/dvt#${n}`;
      const url = `https://github.com/dunay2/dvt/issues/${n}`;
      issues.push({ file: relPosix, key, number: n, url });
    }

    const adr = parseAdr(relPosix, content);
    if (adr) {
      adrRows.push(adr);
      for (const n of issueNums) {
        adrIssueRows.push({
          adrId: adr.id,
          key: `dunay2/dvt#${n}`,
          number: n,
          url: `https://github.com/dunay2/dvt/issues/${n}`,
        });
      }
    }
  }

  return {
    trackedFiles,
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
  };
}

async function ingest() {
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

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    console.log(`🔌 Ingesting repository graph to ${NEO4J_URI} (${NEO4J_DATABASE})`);

    await ensureSchema(session);
    if (KG_RESET) {
      console.log('♻️ Resetting KG labels before ingest...');
      await resetGraph(session);
    }

    for (const c of chunk(files, 300)) {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (m:Modulo {path: row.moduloPath})
        SET m.nombre = row.moduloNombre,
            m.lenguaje = row.moduloLenguaje
        MERGE (a:Archivo {path: row.path})
        SET a.nombre = row.nombre,
            a.tipo = row.tipo,
            a.bytes = row.bytes,
            a.topico = row.topico
        MERGE (m)-[:CONTIENE]->(a)
      `,
        { rows: c }
      );
    }

    for (const c of chunk(deps, 500)) {
      await session.run(
        `
        UNWIND $rows AS row
        MATCH (src:Archivo {path: row.src})
        MATCH (dst:Archivo {path: row.dst})
        MERGE (src)-[:DEPENDE]->(dst)
      `,
        { rows: c }
      );
    }

    for (const c of chunk(classRows, 500)) {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (f:Funcion {key: row.key})
        SET f.nombre = row.nombre,
            f.linea_inicio = row.line,
            f.path = row.file
        WITH row, f
        MATCH (a:Archivo {path: row.file})
        MERGE (a)-[:DEFINE]->(f)
      `,
        { rows: c }
      );
    }

    for (const c of chunk(issues, 500)) {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (i:Issue {key: row.key})
        SET i.number = row.number,
            i.repo = 'dunay2/dvt',
            i.url = row.url
        WITH row, i
        MATCH (a:Archivo {path: row.file})
        MERGE (a)-[:REFERENCIA_ISSUE]->(i)
      `,
        { rows: c }
      );
    }

    for (const c of chunk(roadmapNodes, 20)) {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (r:Roadmap {id: row.id})
        SET r.path = row.path,
            r.nombre = row.name,
            r.topico = row.topico
      `,
        { rows: c }
      );
    }

    for (const c of chunk(phaseNodes, 50)) {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (p:FaseRoadmap {id: row.id})
        SET p.numero = row.number,
            p.nombre = row.name,
            p.orden = row.order,
            p.path = row.sourcePath
      `,
        { rows: c }
      );
    }

    for (const c of chunk(phaseLinks, 100)) {
      await session.run(
        `
        UNWIND $rows AS row
        WITH row
        CALL {
          WITH row
          MATCH (r:Roadmap {id: row.roadmapId})
          MATCH (p:FaseRoadmap {id: row.phaseId})
          WHERE coalesce(row.relation, 'CONTIENE_FASE') = 'CONTIENE_FASE'
          MERGE (r)-[rel:CONTIENE_FASE]->(p)
          SET rel.orden = row.order
          RETURN 1 AS done
          UNION
          WITH row
          MATCH (p1:FaseRoadmap {id: row.roadmapId})
          MATCH (p2:FaseRoadmap {id: row.phaseId})
          WHERE row.relation = 'DESBLOQUEA'
          MERGE (p1)-[rel:DESBLOQUEA]->(p2)
          SET rel.orden = row.order
          RETURN 1 AS done
        }
        RETURN count(*) AS processed
      `,
        { rows: c }
      );
    }

    for (const c of chunk(phaseIssueRows, 200)) {
      await session.run(
        `
        UNWIND $rows AS row
        MATCH (p:FaseRoadmap {id: row.phaseId})
        MERGE (i:Issue {key: row.key})
        SET i.number = row.number,
            i.repo = 'dunay2/dvt',
            i.url = row.url
        MERGE (p)-[:TRACKED_BY]->(i)
      `,
        { rows: c }
      );
    }

    for (const c of chunk(roadmapStatusRows, 50)) {
      await session.run(
        `
        UNWIND $rows AS row
        MATCH (p:FaseRoadmap {id: row.phaseId})
        SET p.estado = row.status
      `,
        { rows: c }
      );
    }

    await session.run(
      `
      MATCH (a:Archivo {path: 'ROADMAP.md'})
      MATCH (r:Roadmap {id: 'ROADMAP_MAIN'})
      MERGE (a)-[:IMPLEMENTA_DECISION]->(r)
    `
    );

    for (const c of chunk(adrRows, 100)) {
      await session.run(
        `
        UNWIND $rows AS row
        MERGE (d:Decision {id: row.id})
        SET d.title = row.title,
            d.date = row.date,
            d.status = row.status,
            d.path = row.path
        REMOVE d.titulo, d.fecha, d.estado
        WITH row, d
        MATCH (a:Archivo {path: row.path})
        MERGE (a)-[:IMPLEMENTA_DECISION]->(d)
      `,
        { rows: c }
      );
    }

    for (const c of chunk(adrIssueRows, 500)) {
      await session.run(
        `
        UNWIND $rows AS row
        MATCH (d:Decision {id: row.adrId})
        MERGE (i:Issue {key: row.key})
        SET i.number = row.number,
            i.repo = 'dunay2/dvt',
            i.url = row.url
        WITH d, i
        MERGE (d)-[:TRACKED_BY]->(i)
      `,
        { rows: c }
      );
    }

    await session.run(
      `
      MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:REFERENCIA_ISSUE]-(a:Archivo)
      MERGE (p)-[:RELACIONA_ARTEFACTO]->(a)
    `
    );

    await session.run(
      `
      MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:TRACKED_BY]-(d:Decision)
      MERGE (p)-[:ANCLA_DECISION]->(d)
    `
    );

    const stats = await session.run(
      `
      MATCH (n)
      RETURN labels(n)[0] AS label, count(*) AS total
      ORDER BY label
    `
    );

    console.log('✅ Ingest completed. Node counts:');
    for (const r of stats.records) {
      console.log(`  - ${r.get('label')}: ${r.get('total').toString()}`);
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

if (require.main === module) {
  ingest().catch((error) => {
    console.error('❌ Ingest failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  SCHEMA_CONSTRAINTS,
  safeNodeId,
  parseRoadmapPhases,
  parseRoadmapStatusRows,
  collectRoadmapRows,
  REPO_ROOT,
  runGitList,
  listAdrFilesFromFs,
  fileType,
  moduloPathFor,
  moduloLanguageFor,
  parseImports,
  parseIssueRefs,
  parseAdr,
  parseClassDefs,
  chunk,
  collectGraphRows,
  ingest,
};
