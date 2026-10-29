-- Planning DB current declarative schema.
-- Governed by ADR-0063. This file contains no migration history or compatibility state.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: architecture; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA architecture;


--
-- Name: component_engineering; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA component_engineering;


--
-- Name: planning_query_store; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA planning_query_store;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';
