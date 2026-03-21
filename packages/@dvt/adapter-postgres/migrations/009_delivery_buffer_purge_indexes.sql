-- Migration 009: indexes for delivery buffer purge scans
--
-- Adds partial indexes on the three tables that DeliveryBufferPurger targets
-- so that range-based DELETE ... WHERE id IN (SELECT id ... LIMIT N) stays
-- efficient even as tables grow.
--
-- outbox.delivered_at  — purge of delivered rows (default retention 7 days)
-- outbox_dead_letter.dead_lettered_at — purge of DL rows (default 30 days)
-- lineage_dead_letter.dead_lettered_at — purge of lineage DL rows (default 30 days)

CREATE INDEX IF NOT EXISTS outbox_delivered_at_idx
ON __SCHEMA__.outbox (delivered_at)
WHERE delivered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS outbox_dead_letter_dead_lettered_at_idx
ON __SCHEMA__.outbox_dead_letter (dead_lettered_at);

CREATE INDEX IF NOT EXISTS lineage_dead_letter_dead_lettered_at_idx
ON __SCHEMA__.lineage_dead_letter (dead_lettered_at);
