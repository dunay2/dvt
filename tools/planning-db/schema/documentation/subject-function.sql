--
-- Name: documentation_subject_key(text); Type: FUNCTION; Schema: planning_query_store; Owner: -
--

CREATE FUNCTION planning_query_store.documentation_subject_key(value text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(coalesce(value, '')),
          '(20[0-9]{6}|20[0-9]{2}-[0-9]{2}-[0-9]{2})',
          ' ',
          'g'
        ),
        '(^|[^a-z0-9])(fowler analysis|user stories|closeout|component|proposal|plan|canon|implementation)([^a-z0-9]|$)',
        ' ',
        'g'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )),
    ''
  );
$_$;
