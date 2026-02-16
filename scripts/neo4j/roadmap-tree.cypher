// Visual graph query for Neo4j Browser
// Usage: open Neo4j Browser and run this query

MATCH pathRoadmap=(r:Roadmap {id: 'ROADMAP_MAIN'})-[:CONTIENE_FASE]->(p:FaseRoadmap)
OPTIONAL MATCH pathUnlock=(p)-[:DESBLOQUEA]->(next:FaseRoadmap)
OPTIONAL MATCH pathIssue=(p)-[:TRACKED_BY]->(i:Issue)
OPTIONAL MATCH pathArtifact=(p)-[:RELACIONA_ARTEFACTO]->(a:Archivo)
RETURN pathRoadmap, pathUnlock, pathIssue, pathArtifact;

// Optional compact status table:
// MATCH (r:Roadmap {id: 'ROADMAP_MAIN'})-[:CONTIENE_FASE]->(p:FaseRoadmap)
// OPTIONAL MATCH (p)-[:DESBLOQUEA]->(next:FaseRoadmap)
// OPTIONAL MATCH (p)-[:TRACKED_BY]->(i:Issue)
// OPTIONAL MATCH (p)-[:RELACIONA_ARTEFACTO]->(a:Archivo)
// RETURN p.id AS fase, p.nombre AS nombre, p.estado AS estado, collect(DISTINCT next.id) AS desbloquea, count(DISTINCT i) AS issues, count(DISTINCT a) AS artifacts
// ORDER BY p.orden;
