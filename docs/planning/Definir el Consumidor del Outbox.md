---
title: Define the Outbox Consumer
status: Draft
owner: docs
last_reviewed: 2026-03-05
planning_type: proposal
---
---

title: Define the Outbox Consumer
status: Draft
owner: docs
last_reviewed: 2026-03-04
planning_type: proposal

---

# Define the Outbox Consumer

Plan General: Definir el Consumidor del Outbox
Problema: Actualmente, la tabla outbox acumula eventos sin un consumidor claramente especificado. Esto provoca que los eventos no se entreguen a los proyectores, dejando las proyecciones obsoletas y rompiendo la consistencia eventual del sistema. Se requiere definir el contrato, comportamiento y operaciÃ³n del consumidor para garantizar la entrega confiable de eventos.

1. Objetivo y Alcance
   Objetivo: Especificar e implementar un consumidor del outbox que garantice la entrega de eventos a los suscriptores (proyectores, sistemas externos) con al menos una garantÃ­a de "al menos una vez", manejo de errores, reintentos y dead letter queue, asegurando que las proyecciones se mantengan actualizadas.

Alcance:

Definir la arquitectura del consumidor (basado en polling, workers, concurrencia).

Establecer polÃ­ticas de entrega, reintentos y backoff.

Definir el manejo de eventos fallidos (dead letter).

Especificar mÃ©tricas y alertas para monitorear la salud del consumidor.

Definir la integraciÃ³n con los proyectores existentes.

Preparar el camino para futuras mejoras (Kafka, Debezium).

2. Requisitos
   Funcionales
   Entrega garantizada: Cada evento debe entregarse al menos una vez a todos los suscriptores registrados.

Orden de entrega: Para un mismo runId, los eventos deben entregarse en orden (por runSeq). Esto es crÃ­tico para la correcciÃ³n de las proyecciones.

Idempotencia: Los suscriptores deben poder manejar entregas duplicadas (el consumidor no garantiza exactamente una vez, pero puede ayudar con idempotencia en la fuente).

Registro dinÃ¡mico de suscriptores: Debe permitir registrar proyectores que implementen IProjector.

Manejo de errores: Si un suscriptor falla temporalmente, se reintentarÃ¡ con backoff. Si falla permanentemente, el evento pasa a dead letter.

Dead letter consultable: Los eventos en dead letter deben poder listarse, inspeccionarse y reenviarse manualmente.

No funcionales
Rendimiento: Debe soportar la tasa de eventos esperada en producciÃ³n (estimar: 1000 runs concurrentes \* 2000 eventos/run = 2M eventos en pico, pero distribuidos en el tiempo). El consumo debe ser al menos igual a la tasa de producciÃ³n para no acumular lag.

Disponibilidad: El consumidor debe ser resiliente a fallos (reintentos, circuit breaker) y escalable horizontalmente (mÃºltiples workers).

MonitorizaciÃ³n: MÃ©tricas en Prometheus, logs estructurados, alertas en caso de lag o errores.

Seguridad: Conexiones a base de datos con credenciales limitadas, evitar exponer informaciÃ³n sensible.

3. DiseÃ±o del Consumidor
   3.1. Componentes
   OutboxWorker: Proceso (o conjunto de procesos) que periÃ³dicamente consulta la tabla outbox en busca de eventos pendientes (next_attempt_at <= now() y attempts < max_attempts). Implementa el patrÃ³n de polling con backoff.

EventDispatcher: Toma un lote de eventos y los entrega a los suscriptores registrados. Cada suscriptor recibe el evento en orden por runId.

Suscriptores (Projectors): Componentes que implementan IProjector.handle(event) y se registran en el EventDispatcher.

DeadLetterHandler: Maneja eventos que exceden el mÃ¡ximo de reintentos, moviÃ©ndolos a la tabla outbox_dead_letter (o equivalente) y emitiendo una alerta.

Coordinador de concurrencia: Para garantizar que mÃºltiples workers no procesen el mismo evento simultÃ¡neamente (usando FOR UPDATE SKIP LOCKED en la consulta o un lease).

3.2. Flujo de procesamiento (por iteraciÃ³n de polling)
sequenceDiagram
participant W as OutboxWorker
participant DB as PostgreSQL (outbox)
participant D as EventDispatcher
participant P as Projectors
participant DL as DeadLetterHandler

    loop Cada intervalo (ej. 1s)
        W->>DB: SELECT * FROM outbox WHERE next_attempt_at <= now() AND attempts < max_attempts ORDER BY run_id, run_seq LIMIT batch_size FOR UPDATE SKIP LOCKED
        DB-->>W: batch de eventos
        alt batch vacÃ­o
            W->>W: esperar siguiente intervalo
        else
            W->>D: dispatch(eventos)
            D->>P: para cada evento, llama a todos los projectores registrados (en orden)
            P-->>D: resultado (ok o error)
            alt todos los projectores OK
                D->>W: confirmar Ã©xito
                W->>DB: DELETE FROM outbox WHERE id IN (...)
            else algÃºn proyector falla
                D->>W: reportar fallo
                W->>DB: UPDATE outbox SET attempts = attempts + 1, last_error = ..., next_attempt_at = calculate_backoff(attempts) WHERE id = ...
                alt attempts >= max_attempts
                    W->>DL: mover a dead letter
                    DL->>DB: INSERT INTO outbox_dead_letter ...; DELETE FROM outbox ...
                end
            end
        end
    end

3.3. GarantÃ­a de orden por runId
La consulta SQL debe ordenar por (run_id, run_seq) para garantizar que los eventos de un mismo run se procesen en orden.

Si un evento falla, los siguientes del mismo run no se procesarÃ¡n hasta que el fallido se resuelva (porque permanece en la tabla y el orden lo impide). Esto es correcto para mantener consistencia.

Para evitar bloqueos, se puede marcar el evento como fallido y continuar con otros runs, pero nunca saltar un evento dentro del mismo run.

4. PolÃ­ticas de Entrega y Reintentos
   MÃ¡ximo de intentos: 5 (configurable).

Backoff exponencial: next_attempt_at = now() + (initial_delay \* 2^attempts). Ejemplo: 1s, 2s, 4s, 8s, 16s.

Tiempo de espera por proyecto: Timeout de 30 segundos por llamada a projector.handle(). Si excede, se considera fallo.

Circuit breaker por proyector: Si un proyector falla repetidamente (ej. 3 veces en 1 minuto), se aÃ­sla temporalmente (no se le entregan eventos) y se alerta.

5. Manejo de Fallos y Dead Letter
   Dead letter table: outbox_dead_letter con misma estructura que outbox mÃ¡s campos: dead_lettered_at, dead_letter_reason.

Acciones sobre dead letter:

Consultar con filtros (runId, error, rango de fechas).

Reintentar manualmente (reinsertar en outbox con attempts=0).

Descartar (solo para administradores).

Alerta: Si la dead letter acumula mÃ¡s de X eventos en Y minutos, alerta P2.

6. MÃ©tricas y Monitoreo
   MÃ©tricas a exponer vÃ­a Prometheus:

MÃ©trica Tipo DescripciÃ³n
outbox_pending_events Gauge NÃºmero de eventos pendientes en outbox (filtrados por next_attempt_at <= now)
outbox_processing_duration_seconds Histogram Tiempo de procesamiento de un lote de eventos
outbox_events_delivered_total Counter Eventos entregados exitosamente (etiquetados por proyector)
outbox_events_failed_total Counter Eventos fallidos (etiquetados por proyector y tipo de error)
outbox_dead_letter_total Counter Eventos enviados a dead letter
outbox_worker_lag_seconds Gauge Diferencia entre el timestamp del evento mÃ¡s antiguo pendiente y now()
outbox_consumer_health Gauge 1 si el worker estÃ¡ activo, 0 si no
Alertas:

OutboxLagHigh: Lag > 5 minutos durante 2 minutos.

OutboxDeadLetterAccumulating: Dead letter count > 10 en 5 minutos.

OutboxWorkerDown: MÃ©trica de health ausente por 1 minuto.

OutboxHighErrorRate: Tasa de fallos > 5% en 5 minutos.

Logs estructurados (JSON) con campos: event_id, run_id, projector, attempt, error, duration.

7. IntegraciÃ³n con Proyectores Actuales y Futuros
   Registro: Los proyectores se registran en EventDispatcher durante el arranque del worker. Pueden ser estÃ¡ticos (configuraciÃ³n) o dinÃ¡micos (descubrimiento).

Interfaz del proyector:

typescript
interface IProjector {
handle(event: OutboxEvent): Promise<void>;
// Opcional: idempotencyKey para evitar duplicados si el proyector no es idempotente
}
Evento outbox: Debe contener toda la informaciÃ³n necesaria: event_type, payload, run_id, run_seq, created_at.

Futuro (Kafka/Debezium): El worker actual puede convivir con una futura pipeline basada en CDC. En ese caso, el worker podrÃ­a desactivarse o actuar como fallback. La tabla outbox seguirÃ­a siendo el origen de verdad.

8. ImplementaciÃ³n por Fases
   Fase 1: Worker bÃ¡sico (inmediato)
   Implementar OutboxWorker con polling simple, un solo hilo, sin concurrencia.

Usar FOR UPDATE SKIP LOCKED para evitar conflictos si se escala a mÃºltiples workers (pero inicialmente uno).

Backoff exponencial y dead letter.

MÃ©tricas bÃ¡sicas.

Pruebas unitarias e integraciÃ³n.

Fase 2: Concurrencia y escalabilidad
Permitir mÃºltiples workers (mÃºltiples pods) usando SKIP LOCKED para distribuir carga.

AÃ±adir circuit breaker por proyector.

Mejorar mÃ©tricas con etiquetas por proyector.

Pruebas de carga.

Fase 3: Pipeline de eventos con Kafka (opcional)
Introducir Debezium para capturar cambios de outbox y publicarlos en Kafka.

Los proyectores se suscriben a tÃ³picos Kafka.

El worker actual puede desactivarse o mantenerse como respaldo.

Requiere coordinaciÃ³n con el equipo de plataforma.

9. Pruebas y ValidaciÃ³n
   Unitarias: Mock de base de datos y projectores para probar lÃ³gica de reintentos, dead letter, orden.

IntegraciÃ³n: Con PostgreSQL real, verificar que los eventos se entregan en orden y que los fallos se manejan correctamente.

Carga: Simular alta tasa de eventos y verificar que el lag no crece, y que los reintentos funcionan.

Caos: Matar el worker mientras procesa, verificar que no se pierden eventos (gracias a SKIP LOCKED y transacciones).

10. DocumentaciÃ³n y Runbooks
    Documento de diseÃ±o: Este plan, incluyendo diagramas y decisiones.

Runbook:

CÃ³mo monitorear el lag y la dead letter.

Procedimiento para reintentar eventos en dead letter.

Escalamiento manual de workers.

QuÃ© hacer si un proyector falla constantemente (aislarlo, investigar).

ActualizaciÃ³n de ADRs: Crear ADR para la arquitectura del consumidor (o actualizar ADR-0009).

Resumen de Entregables
Entregable DescripciÃ³n Responsable Plazo
EspecificaciÃ³n tÃ©cnica Documento con diseÃ±o detallado (este plan) Arquitecto 1 dÃ­a
ImplementaciÃ³n Fase 1 CÃ³digo del worker bÃ¡sico, mÃ©tricas, tests Dev 3-5 dÃ­as
Pruebas de integraciÃ³n ValidaciÃ³n con entorno de prueba QA 2 dÃ­as
DocumentaciÃ³n y runbooks GuÃ­as para operaciones Dev/Arquitecto 1 dÃ­a
Despliegue inicial Puesta en producciÃ³n con monitoreo Ops 1 dÃ­a
Nota: Este plan asume que la tabla outbox ya existe y tiene los campos necesarios (run_id, run_seq, event_type, payload, attempts, next_attempt_at, last_error). Si no, deben aÃ±adirse en una migraciÃ³n previa.
