create or replace procedure [[procedureName]](p_run_id text, p_rows integer)
language plpgsql
as $procedure$
declare
  inserted_rows bigint;
begin
  if p_run_id is null or p_rows is null or p_rows not between 1 and 100000 then
    raise exception 'A run ID and 1 to 100000 rows are required';
  end if;
  insert into [[targetTable]] (run_id, item_no)
    select p_run_id, n from generate_series(1, p_rows) as items(n);
  get diagnostics inserted_rows = row_count;
  insert into [[auditTable]] (run_id, rows_written, completed_at)
    values (p_run_id, inserted_rows, clock_timestamp());
end;
$procedure$;
