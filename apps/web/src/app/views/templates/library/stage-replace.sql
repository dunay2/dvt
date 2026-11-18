create or replace procedure [[procedureName]](p_min_rows bigint default 1)
language plpgsql
as $procedure$
declare
  staged_count bigint;
begin
  create temporary table dvt_reload_stage on commit drop as
    select event_id, event_date, amount from [[sourceTable]];
  get diagnostics staged_count = row_count;
  if p_min_rows is null or p_min_rows < 0 or staged_count < p_min_rows then
    raise exception 'Unexpected staging count % for minimum %', staged_count, p_min_rows;
  end if;

  lock table [[targetTable]] in share row exclusive mode;
  [[cleanup]] [[targetTable]];
  insert into [[targetTable]] (event_id, event_date, amount)
    select event_id, event_date, amount from pg_temp.dvt_reload_stage;
  drop table pg_temp.dvt_reload_stage;
end;
$procedure$;
