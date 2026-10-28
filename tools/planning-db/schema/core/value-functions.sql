--
-- Name: sha256_text(text); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.sha256_text(value text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  select encode(digest(convert_to(value, 'UTF8'), 'sha256'), 'hex')
$$;


--
-- Name: stable_jsonb_text(jsonb); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.stable_jsonb_text(value jsonb) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  select case jsonb_typeof(value)
    when 'null' then 'null'
    when 'boolean' then value::text
    when 'number' then value::text
    when 'string' then to_jsonb(value #>> '{}')::text
    when 'array' then '[' || coalesce((
      select string_agg(
        planning_query_store.stable_jsonb_text(element),
        ','
        order by ordinality
      )
      from jsonb_array_elements(value) with ordinality as items(element, ordinality)
    ), '') || ']'
    when 'object' then '{' || coalesce((
      select string_agg(
        to_jsonb(key)::text || ':' || planning_query_store.stable_jsonb_text(entry_value),
        ','
        order by key
      )
      from jsonb_each(value) as entries(key, entry_value)
    ), '') || '}'
  end
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;
