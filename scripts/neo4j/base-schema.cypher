// Constraints
MATCH (n)
WHERE size(labels(n)) = 0
DETACH DELETE n;

CREATE CONSTRAINT modulo_path_unique IF NOT EXISTS
FOR (m:Modulo)
REQUIRE m.path IS UNIQUE;

CREATE CONSTRAINT archivo_path_unique IF NOT EXISTS
FOR (a:Archivo)
REQUIRE a.path IS UNIQUE;

CREATE CONSTRAINT decision_titulo_unique IF NOT EXISTS
FOR (d:Decision)
REQUIRE d.titulo IS UNIQUE;

CREATE CONSTRAINT persona_nombre_unique IF NOT EXISTS
FOR (p:Persona)
REQUIRE p.nombre IS UNIQUE;

// Base seed aligned with ADR-0002
MERGE (mod:Modulo {path: 'docs/decisions'})
SET mod.nombre = 'Decisiones Arquitectonicas',
    mod.lenguaje = 'markdown';

MERGE (adrFile:Archivo {path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md'})
SET adrFile.nombre = 'ADR-0002-neo4j-knowledge-graph-context-repository.md',
    adrFile.tipo = 'md';

MERGE (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
SET adr.fecha = '2026-02-16',
    adr.contexto = 'Contexto distribuido entre codigo, ADRs y documentacion, con perdida de contexto entre sesiones de IA.',
    adr.decision = 'Adoptar Neo4j como repositorio central de conocimiento arquitectonico y de codigo.',
    adr.consecuencias = 'Mejor recuperacion de contexto por tarea, mayor disciplina de mantenimiento del grafo.';

MERGE (owner:Persona {nombre: 'Maintainers de arquitectura, engine y tooling'})
SET owner.rol = 'Arquitectura y plataforma';

MATCH (mod:Modulo {path: 'docs/decisions'})
MATCH (adrFile:Archivo {path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md'})
MERGE (mod)-[:CONTIENE]->(adrFile);

MATCH (adrFile:Archivo {path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md'})
MATCH (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
MERGE (adrFile)-[:IMPLEMENTA_DECISION]->(adr);

MATCH (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
MATCH (owner:Persona {nombre: 'Maintainers de arquitectura, engine y tooling'})
MERGE (adr)-[:CONSULTO_A]->(owner);

// Knowledge base docs module
MERGE (kmod:Modulo {path: 'docs/knowledge'})
SET kmod.nombre = 'Knowledge Base',
    kmod.lenguaje = 'markdown';

MERGE (kIndex:Archivo {path: 'docs/knowledge/INDEX.md'})
SET kIndex.nombre = 'INDEX.md',
    kIndex.tipo = 'md';

MERGE (kRepo:Archivo {path: 'docs/knowledge/REPOSITORY_MAP.md'})
SET kRepo.nombre = 'REPOSITORY_MAP.md',
    kRepo.tipo = 'md';

MERGE (kRoadmap:Archivo {path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md'})
SET kRoadmap.nombre = 'ROADMAP_AND_ISSUES_MAP.md',
    kRoadmap.tipo = 'md';

MATCH (kmod:Modulo {path: 'docs/knowledge'})
MATCH (kIndex:Archivo {path: 'docs/knowledge/INDEX.md'})
MERGE (kmod)-[:CONTIENE]->(kIndex);

MATCH (kmod:Modulo {path: 'docs/knowledge'})
MATCH (kRepo:Archivo {path: 'docs/knowledge/REPOSITORY_MAP.md'})
MERGE (kmod)-[:CONTIENE]->(kRepo);

MATCH (kmod:Modulo {path: 'docs/knowledge'})
MATCH (kRoadmap:Archivo {path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md'})
MERGE (kmod)-[:CONTIENE]->(kRoadmap);

MATCH (kRepo:Archivo {path: 'docs/knowledge/REPOSITORY_MAP.md'})
MATCH (adrFile:Archivo {path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md'})
MERGE (kRepo)-[:DEPENDE]->(adrFile);

MATCH (kRoadmap:Archivo {path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md'})
MATCH (adrFile:Archivo {path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md'})
MERGE (kRoadmap)-[:DEPENDE]->(adrFile);

MATCH (kIndex:Archivo {path: 'docs/knowledge/INDEX.md'})
MATCH (kRepo:Archivo {path: 'docs/knowledge/REPOSITORY_MAP.md'})
MERGE (kIndex)-[:DEPENDE]->(kRepo);

MATCH (kIndex:Archivo {path: 'docs/knowledge/INDEX.md'})
MATCH (kRoadmap:Archivo {path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md'})
MERGE (kIndex)-[:DEPENDE]->(kRoadmap);

MATCH (kIndex:Archivo {path: 'docs/knowledge/INDEX.md'})
MATCH (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
MERGE (kIndex)-[:IMPLEMENTA_DECISION]->(adr);

MATCH (kRepo:Archivo {path: 'docs/knowledge/REPOSITORY_MAP.md'})
MATCH (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
MERGE (kRepo)-[:IMPLEMENTA_DECISION]->(adr);

MATCH (kRoadmap:Archivo {path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md'})
MATCH (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
MERGE (kRoadmap)-[:IMPLEMENTA_DECISION]->(adr);

// Engine module + key files
MERGE (emod:Modulo {path: 'packages/@dvt/engine/src'})
SET emod.nombre = 'Engine Core',
    emod.lenguaje = 'typescript';

MERGE (wfFile:Archivo {path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts'})
SET wfFile.nombre = 'WorkflowEngine.ts',
    wfFile.tipo = 'ts';

MERGE (spFile:Archivo {path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts'})
SET spFile.nombre = 'SnapshotProjector.ts',
    spFile.tipo = 'ts';

MERGE (idFile:Archivo {path: 'packages/@dvt/engine/src/core/idempotency.ts'})
SET idFile.nombre = 'idempotency.ts',
    idFile.tipo = 'ts';

MATCH (emod:Modulo {path: 'packages/@dvt/engine/src'})
MATCH (wfFile:Archivo {path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts'})
MERGE (emod)-[:CONTIENE]->(wfFile);

MATCH (emod:Modulo {path: 'packages/@dvt/engine/src'})
MATCH (spFile:Archivo {path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts'})
MERGE (emod)-[:CONTIENE]->(spFile);

MATCH (emod:Modulo {path: 'packages/@dvt/engine/src'})
MATCH (idFile:Archivo {path: 'packages/@dvt/engine/src/core/idempotency.ts'})
MERGE (emod)-[:CONTIENE]->(idFile);

MERGE (wfCls:Funcion {nombre: 'WorkflowEngine', linea_inicio: 93, linea_fin: 583});
MERGE (spCls:Funcion {nombre: 'SnapshotProjector', linea_inicio: 7, linea_fin: 200});
MERGE (idCls:Funcion {nombre: 'IdempotencyKeyBuilder', linea_inicio: 19, linea_fin: 120});

MATCH (wfFile:Archivo {path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts'})
MATCH (wfCls:Funcion {nombre: 'WorkflowEngine'})
MERGE (wfFile)-[:DEFINE]->(wfCls);

MATCH (spFile:Archivo {path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts'})
MATCH (spCls:Funcion {nombre: 'SnapshotProjector'})
MERGE (spFile)-[:DEFINE]->(spCls);

MATCH (idFile:Archivo {path: 'packages/@dvt/engine/src/core/idempotency.ts'})
MATCH (idCls:Funcion {nombre: 'IdempotencyKeyBuilder'})
MERGE (idFile)-[:DEFINE]->(idCls);

MATCH (wfFile:Archivo {path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts'})
MATCH (spFile:Archivo {path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts'})
MERGE (wfFile)-[:DEPENDE]->(spFile);

MATCH (wfFile:Archivo {path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts'})
MATCH (idFile:Archivo {path: 'packages/@dvt/engine/src/core/idempotency.ts'})
MERGE (wfFile)-[:DEPENDE]->(idFile);

MATCH (wfFile:Archivo {path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts'})
MATCH (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
MERGE (wfFile)-[:IMPLEMENTA_DECISION]->(adr);

// Adapter temporal module + key files
MERGE (tmod:Modulo {path: 'packages/@dvt/adapter-temporal/src'})
SET tmod.nombre = 'Temporal Adapter',
    tmod.lenguaje = 'typescript';

MERGE (taFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts'})
SET taFile.nombre = 'TemporalAdapter.ts',
    taFile.tipo = 'ts';

MERGE (twFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts'})
SET twFile.nombre = 'RunPlanWorkflow.ts',
    twFile.tipo = 'ts';

MATCH (tmod:Modulo {path: 'packages/@dvt/adapter-temporal/src'})
MATCH (taFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts'})
MERGE (tmod)-[:CONTIENE]->(taFile);

MATCH (tmod:Modulo {path: 'packages/@dvt/adapter-temporal/src'})
MATCH (twFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts'})
MERGE (tmod)-[:CONTIENE]->(twFile);

MERGE (taCls:Funcion {nombre: 'TemporalAdapter', linea_inicio: 47, linea_fin: 420});
MERGE (twCls:Funcion {nombre: 'RunPlanWorkflow', linea_inicio: 31, linea_fin: 320});

MATCH (taFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts'})
MATCH (taCls:Funcion {nombre: 'TemporalAdapter'})
MERGE (taFile)-[:DEFINE]->(taCls);

MATCH (twFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts'})
MATCH (twCls:Funcion {nombre: 'RunPlanWorkflow'})
MERGE (twFile)-[:DEFINE]->(twCls);

MATCH (taFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts'})
MATCH (wfFile:Archivo {path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts'})
MERGE (taFile)-[:DEPENDE]->(wfFile);

MATCH (twFile:Archivo {path: 'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts'})
MATCH (adr:Decision {titulo: 'ADR-0002: Adopcion de Neo4j como repositorio central de conocimiento'})
MERGE (twFile)-[:IMPLEMENTA_DECISION]->(adr);
