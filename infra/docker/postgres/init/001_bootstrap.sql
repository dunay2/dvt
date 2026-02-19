-- 001_bootstrap.sql
-- Initial schemas for DVT+

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS eventstore;

-- Basic health table (optional)
CREATE TABLE IF NOT EXISTS core.health_check (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
