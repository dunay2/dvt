Plan General: Definir el Consumidor del Outbox
Problema: Actualmente, la tabla outbox acumula eventos sin un consumidor claramente especificado. Esto provoca que los eventos no se entreguen a los proyectores, dejando las proyecciones obsoletas y rompiendo la consistencia eventual del sistema. Se requiere definir el contrato, comportamiento y operación del consumidor para garantizar la entrega confiable de eventos.

1. Objetivo y Alcance
   Objetivo: Especificar e implementar un consumidor del outbox que garantice la entrega de eventos a los suscriptores (proyectores, sistemas externos) con al menos una garantía de "al menos una vez", manejo de errores, reintentos y dead letter queue, asegurando que las proyecciones se mantengan actualizadas.

Alcance:

Definir la arquitectura del consumidor (basado en polling, workers, concurrencia).

Establecer políticas de entrega, reintentos y backoff.

Definir el manejo de eventos fallidos (dead letter).

Especificar métricas y alertas para monitorear la salud del consumidor.

Definir la integración con los proyectores existentes.

Preparar el camino para futuras mejoras (Kafka, Debezium).

2. Requisitos
   Funcionales
   Entrega garantizada: Cada evento debe entregarse al menos una vez a todos los suscriptores registrados.

Orden de entrega: Para un mismo runId, los eventos deben entregarse en orden (por runSeq). Esto es crítico para la corrección de las proyecciones.

Idempotencia: Los suscriptores deben poder manejar entregas duplicadas (el consumidor no garantiza exactamente una vez, pero puede ayudar con idempotencia en la fuente).

Registro dinámico de suscriptores: Debe permitir registrar proyectores que implementen IProjector.

Manejo de errores: Si un suscriptor falla temporalmente, se reintentará con backoff. Si falla permanentemente, el evento pasa a dead letter.

Dead letter consultable: Los eventos en dead letter deben poder listarse, inspeccionarse y reenviarse manualmente.

No funcionales
Rendimiento: Debe soportar la tasa de eventos esperada en producción (estimar: 1000 runs concurrentes \* 2000 eventos/run = 2M eventos en pico, pero distribuidos en el tiempo). El consumo debe ser al menos igual a la tasa de producción para no acumular lag.

Disponibilidad: El consumidor debe ser resiliente a fallos (reintentos, circuit breaker) y escalable horizontalmente (múltiples workers).

Monitorización: Métricas en Prometheus, logs estructurados, alertas en caso de lag o errores.

Seguridad: Conexiones a base de datos con credenciales limitadas, evitar exponer información sensible.

3. Diseño del Consumidor
   3.1. Componentes
   OutboxWorker: Proceso (o conjunto de procesos) que periódicamente consulta la tabla outbox en busca de eventos pendientes (next_attempt_at <= now() y attempts < max_attempts). Implementa el patrón de polling con backoff.

EventDispatcher: Toma un lote de eventos y los entrega a los suscriptores registrados. Cada suscriptor recibe el evento en orden por runId.

Suscriptores (Projectors): Componentes que implementan IProjector.handle(event) y se registran en el EventDispatcher.

DeadLetterHandler: Maneja eventos que exceden el máximo de reintentos, moviéndolos a la tabla outbox_dead_letter (o equivalente) y emitiendo una alerta.

Coordinador de concurrencia: Para garantizar que múltiples workers no procesen el mismo evento simultáneamente (usando FOR UPDATE SKIP LOCKED en la consulta o un lease).

3.2. Flujo de procesamiento (por iteración de polling)
sequenceDiagram
participant W as OutboxWorker
participant DB as PostgreSQL (outbox)
participant D as EventDispatcher
participant P as Projectors
participant DL as DeadLetterHandler

    loop Cada intervalo (ej. 1s)
        W->>DB: SELECT * FROM outbox WHERE next_attempt_at <= now() AND attempts < max_attempts ORDER BY run_id, run_seq LIMIT batch_size FOR UPDATE SKIP LOCKED
        DB-->>W: batch de eventos
        alt batch vacío
            W->>W: esperar siguiente intervalo
        else
            W->>D: dispatch(eventos)
            D->>P: para cada evento, llama a todos los projectores registrados (en orden)
            P-->>D: resultado (ok o error)
            alt todos los projectores OK
                D->>W: confirmar éxito
                W->>DB: DELETE FROM outbox WHERE id IN (...)
            else algún proyector falla
                D->>W: reportar fallo
                W->>DB: UPDATE outbox SET attempts = attempts + 1, last_error = ..., next_attempt_at = calculate_backoff(attempts) WHERE id = ...
                alt attempts >= max_attempts
                    W->>DL: mover a dead letter
                    DL->>DB: INSERT INTO outbox_dead_letter ...; DELETE FROM outbox ...
                end
            end
        end
    end

3.3. Garantía de orden por runId
La consulta SQL debe ordenar por (run_id, run_seq) para garantizar que los eventos de un mismo run se procesen en orden.

Si un evento falla, los siguientes del mismo run no se procesarán hasta que el fallido se resuelva (porque permanece en la tabla y el orden lo impide). Esto es correcto para mantener consistencia.

Para evitar bloqueos, se puede marcar el evento como fallido y continuar con otros runs, pero nunca saltar un evento dentro del mismo run.

4. Políticas de Entrega y Reintentos
   Máximo de intentos: 5 (configurable).

Backoff exponencial: next_attempt_at = now() + (initial_delay \* 2^attempts). Ejemplo: 1s, 2s, 4s, 8s, 16s.

Tiempo de espera por proyecto: Timeout de 30 segundos por llamada a projector.handle(). Si excede, se considera fallo.

Circuit breaker por proyector: Si un proyector falla repetidamente (ej. 3 veces en 1 minuto), se aísla temporalmente (no se le entregan eventos) y se alerta.

5. Manejo de Fallos y Dead Letter
   Dead letter table: outbox_dead_letter con misma estructura que outbox más campos: dead_lettered_at, dead_letter_reason.

Acciones sobre dead letter:

Consultar con filtros (runId, error, rango de fechas).

Reintentar manualmente (reinsertar en outbox con attempts=0).

Descartar (solo para administradores).

Alerta: Si la dead letter acumula más de X eventos en Y minutos, alerta P2.

6. Métricas y Monitoreo
   Métricas a exponer vía Prometheus:

Métrica Tipo Descripción
outbox_pending_events Gauge Número de eventos pendientes en outbox (filtrados por next_attempt_at <= now)
outbox_processing_duration_seconds Histogram Tiempo de procesamiento de un lote de eventos
outbox_events_delivered_total Counter Eventos entregados exitosamente (etiquetados por proyector)
outbox_events_failed_total Counter Eventos fallidos (etiquetados por proyector y tipo de error)
outbox_dead_letter_total Counter Eventos enviados a dead letter
outbox_worker_lag_seconds Gauge Diferencia entre el timestamp del evento más antiguo pendiente y now()
outbox_consumer_health Gauge 1 si el worker está activo, 0 si no
Alertas:

OutboxLagHigh: Lag > 5 minutos durante 2 minutos.

OutboxDeadLetterAccumulating: Dead letter count > 10 en 5 minutos.

OutboxWorkerDown: Métrica de health ausente por 1 minuto.

OutboxHighErrorRate: Tasa de fallos > 5% en 5 minutos.

Logs estructurados (JSON) con campos: event_id, run_id, projector, attempt, error, duration.

7. Integración con Proyectores Actuales y Futuros
   Registro: Los proyectores se registran en EventDispatcher durante el arranque del worker. Pueden ser estáticos (configuración) o dinámicos (descubrimiento).

Interfaz del proyector:

typescript
interface IProjector {
handle(event: OutboxEvent): Promise<void>;
// Opcional: idempotencyKey para evitar duplicados si el proyector no es idempotente
}
Evento outbox: Debe contener toda la información necesaria: event_type, payload, run_id, run_seq, created_at.

Futuro (Kafka/Debezium): El worker actual puede convivir con una futura pipeline basada en CDC. En ese caso, el worker podría desactivarse o actuar como fallback. La tabla outbox seguiría siendo el origen de verdad.

8. Implementación por Fases
   Fase 1: Worker básico (inmediato)
   Implementar OutboxWorker con polling simple, un solo hilo, sin concurrencia.

Usar FOR UPDATE SKIP LOCKED para evitar conflictos si se escala a múltiples workers (pero inicialmente uno).

Backoff exponencial y dead letter.

Métricas básicas.

Pruebas unitarias e integración.

Fase 2: Concurrencia y escalabilidad
Permitir múltiples workers (múltiples pods) usando SKIP LOCKED para distribuir carga.

Añadir circuit breaker por proyector.

Mejorar métricas con etiquetas por proyector.

Pruebas de carga.

Fase 3: Pipeline de eventos con Kafka (opcional)
Introducir Debezium para capturar cambios de outbox y publicarlos en Kafka.

Los proyectores se suscriben a tópicos Kafka.

El worker actual puede desactivarse o mantenerse como respaldo.

Requiere coordinación con el equipo de plataforma.

9. Pruebas y Validación
   Unitarias: Mock de base de datos y projectores para probar lógica de reintentos, dead letter, orden.

Integración: Con PostgreSQL real, verificar que los eventos se entregan en orden y que los fallos se manejan correctamente.

Carga: Simular alta tasa de eventos y verificar que el lag no crece, y que los reintentos funcionan.

Caos: Matar el worker mientras procesa, verificar que no se pierden eventos (gracias a SKIP LOCKED y transacciones).

10. Documentación y Runbooks
    Documento de diseño: Este plan, incluyendo diagramas y decisiones.

Runbook:

Cómo monitorear el lag y la dead letter.

Procedimiento para reintentar eventos en dead letter.

Escalamiento manual de workers.

Qué hacer si un proyector falla constantemente (aislarlo, investigar).

Actualización de ADRs: Crear ADR para la arquitectura del consumidor (o actualizar ADR-0009).

Resumen de Entregables
Entregable Descripción Responsable Plazo
Especificación técnica Documento con diseño detallado (este plan) Arquitecto 1 día
Implementación Fase 1 Código del worker básico, métricas, tests Dev 3-5 días
Pruebas de integración Validación con entorno de prueba QA 2 días
Documentación y runbooks Guías para operaciones Dev/Arquitecto 1 día
Despliegue inicial Puesta en producción con monitoreo Ops 1 día
Nota: Este plan asume que la tabla outbox ya existe y tiene los campos necesarios (run_id, run_seq, event_type, payload, attempts, next_attempt_at, last_error). Si no, deben añadirse en una migración previa.
