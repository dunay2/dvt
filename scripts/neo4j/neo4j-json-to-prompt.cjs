#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    input: 'private/neo4j/output/context.json',
    out: 'private/neo4j/output/context.prompt.md',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--input' && argv[i + 1]) {
      args.input = argv[i + 1];
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
  console.log('Usage: node scripts/neo4j/neo4j-json-to-prompt.cjs [--input <json>] [--out <md>]');
}

function toBulletList(items, formatter) {
  if (!Array.isArray(items) || items.length === 0) {
    return '- (sin elementos)';
  }
  return items.map((item) => `- ${formatter(item)}`).join('\n');
}

function buildPrompt(payload) {
  const first = Array.isArray(payload.results) && payload.results.length > 0 ? payload.results[0] : null;

  if (!first) {
    return [
      '# Contexto arquitectónico para IA',
      '',
      'No se encontraron resultados para la consulta solicitada.',
    ].join('\n');
  }

  const archivo = first.archivo || {};
  const modulo = first.modulo || {};
  const dependencias = first.dependencias || [];
  const decisiones = first.decisiones || [];
  const personas = first.personas || [];

  return [
    '# Contexto arquitectónico para IA',
    '',
    '## Archivo objetivo',
    `- path: ${archivo.path || payload.filePath || '(desconocido)'}`,
    `- nombre: ${archivo.nombre || '(desconocido)'}`,
    `- tipo: ${archivo.tipo || '(desconocido)'}`,
    '',
    '## Módulo contenedor',
    `- path: ${modulo.path || '(desconocido)'}`,
    `- nombre: ${modulo.nombre || '(desconocido)'}`,
    '',
    '## Dependencias directas',
    toBulletList(dependencias, (d) => `${d.path || '(sin path)'} (${d.nombre || 'sin nombre'})`),
    '',
    '## Decisiones relacionadas (ADR)',
    toBulletList(
      decisiones,
      (d) => `${d.title || d.titulo || 'sin titulo'} | status=${d.status || d.estado || 'n/a'} | date=${d.date || d.fecha || 'n/a'}`
    ),
    '',
    '## Responsables / expertos',
    toBulletList(personas, (p) => `${p.nombre || 'sin nombre'} (${p.rol || 'sin rol'})`),
    '',
    '## Instrucción sugerida para el asistente',
    'Usa este contexto para proponer cambios compatibles con el ADR relacionado, minimizando impacto en contratos y preservando trazabilidad entre documentación y código.',
  ].join('\n');
}

function run() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.out);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input JSON not found: ${args.input}`);
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const prompt = buildPrompt(payload);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, prompt, 'utf-8');

  console.log(`✅ Prompt generated: ${args.out}`);
}

try {
  run();
} catch (error) {
  console.error('❌ JSON→prompt failed:', error.message);
  process.exit(1);
}
