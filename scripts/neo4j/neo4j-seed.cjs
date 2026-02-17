#!/usr/bin/env node
/* eslint-env node */
/* global console, process, __dirname */
/**
 * Seed base architectural knowledge graph in Neo4j.
 *
 * Environment variables:
 * - NEO4J_URI (default: bolt://localhost:7687)
 * - NEO4J_USER (default: neo4j)
 * - NEO4J_PASSWORD (default: password)
 * - NEO4J_DATABASE (default: neo4j)
 */

const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';
const __dirnameLocal = __dirname;

const cypherPath = path.join(__dirnameLocal, 'base-schema.cypher');

if (!fs.existsSync(cypherPath)) {
  console.error(`❌ Cypher file not found: ${cypherPath}`);
  process.exit(1);
}

const cypher = fs.readFileSync(cypherPath, 'utf-8');

function splitCypherStatements(input) {
  return input
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

async function run() {
  const session = driver.session({ database: NEO4J_DATABASE });
  try {
    console.log(`🔌 Connecting to ${NEO4J_URI} (${NEO4J_DATABASE})...`);
    const statements = splitCypherStatements(cypher);
    for (const stmt of statements) {
      await session.run(stmt);
    }
    console.log('✅ Base seed applied successfully.');
  } finally {
    await session.close();
    await driver.close();
  }
}

run().catch((error) => {
  console.error('❌ Seed failed:', error.message);
  process.exit(1);
});
