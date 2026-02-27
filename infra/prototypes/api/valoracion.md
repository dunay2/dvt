Los ADRs de la capa UI (evaluación)
ADR Decisión Calificación
ADR-0001 SSE como transporte UI, seq como SSE id para catchup ✅ Correcto — RFC 6202 compliant
ADR-0002 Postgres = autoridad, Kafka = bus de distribución ✅ Alineado con mejora discutir
ADR-0003 Transactional outbox (DB TX → background publisher) ✅ Patrón correcto
ADR-0004 UPSERT en run_seq para allocación monotónica ⚠️ Correcto en concepto, diverge del diseño final
ADR-0005 Single-process MVP: API + outbox publisher + kafka tail ✅ Pragmático para MVP
El schema 001_init.sql — análisis
El schema prueba el concepto pero hay 4 divergencias con mejora discutir que hay que resolver para la implementación real:

Divergencia 1 — Counter de seq como tabla separada:

-- Prototipo: tabla run_seq independiente
CREATE TABLE IF NOT EXISTS run_seq (
run_id TEXT PRIMARY KEY,
next_seq BIGINT NOT NULL
);
vs. mejora discutir: run_metadata.current_run_seq — el counter vive en la misma fila de metadata que se lockea con FOR UPDATE. Menos overhead de join, mismo garantía atómica.

Divergencia 2 — outbox_pending_idx no es partial index:

-- Prototipo: escanea TODAS las filas incluídas las publicadas
CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (published_at, created_at);
La query del publisher filtra WHERE published_at IS NULL. Sin partial index, a medida que crece la tabla este índice escanea millones de filas publicadas. El correcto:

CREATE INDEX IF NOT EXISTS outbox_pending_idx ON outbox (created_at)
WHERE published_at IS NULL; -- partial index
Divergencia 3 — Sin ordering_key / contiguous leasing:

El publisher actual publica por created_at ASC sin garantía de ordering por run. Si el evento seq=1 de run A falla y seq=2 de run A existe, seq=2 se publica antes de seq=1. El UI ve la línea de tiempo out-of-order. mejora discutir resuelve esto con ordering_key = tenantId:runId y la constraint "no run_seq menor pendiente".

Divergencia 4 — Sin tenant_id:

outbox, run_events, run_node_state no tienen tenant_id. Sistema multi-tenant sin aislamiento por tenant en el schema.

El patrón de Redpanda — evaluación

redpanda:
image: redpandadata/redpanda:v24.2.7
command: - --kafka-addr=PLAINTEXT://0.0.0.0:9092 - --advertise-kafka-addr=PLAINTEXT://localhost:9092 - --smp=1 --memory=1G
Redpanda es la elección correcta para desarrollo local: API Kafka 100% compatible, un solo binario, sin JVM, arranca en segundos. La configuración es mínima y apropiada para dev. Para producción ya hay proveedores de Kafka/Redpanda gestionados.

Vista consolidada del sistema completo
Ahora que tengo todo, el mapa real del proyecto es:

packages/@dvt/engine ← WorkflowEngine + RunEvents (ciclo de vida del run)
packages/@dvt/adapter-temporal ← Temporal.io execution
packages/@dvt/adapter-postgres ← State store (stub → implementar con mejora 1)
packages/@dvt/plan-interpreter ← DAG puro

infra/docker/postgres/redpanda ← Dev environment (Postgres + Redpanda)
└─ migrations/001_init.sql ← Schema del prototipo UI (necesita alineación)

docs/api/ ← Prototipo SSE+Kafka (prueba el loop, necesita alineación)
apps/api/ ← Producción (skeleton, necesita lógica de dominio)
Dos workstreams independientes convergen en apps/api:

Workstream A (engine): mejora discutir → adapter-postgres → IRunStateStore real
appendEventsTx, bootstrapRunTx, outbox, snapshots

Workstream B (UI): docs/api patterns → apps/api routes
SSE catchup, RunStreamHub, OutboxPublisher, KafkaTail
Diagnóstico final
El proyecto tiene una arquitectura bien pensada y completamente validada por separado en dos capas. Lo que falta es la integración:

adapter-postgres debe implementar mejora discutir — es el corazón pendiente
apps/api debe absorber los patrones de docs/api adaptados a @dvt/contracts
El schema de 001_init.sql debe evolucionar hacia el DDL completo de mejora discutir
