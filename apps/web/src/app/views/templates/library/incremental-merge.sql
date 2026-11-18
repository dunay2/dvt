create or replace procedure [[procedureName]](p_changed_since timestamp_ntz)
returns varchar
language sql
execute as caller
as
$$
begin
  merge into [[targetTable]] as dest
  using (
    select event_id, updated_at, ingest_seq, amount
    from [[sourceTable]]
    where updated_at >= :p_changed_since
    qualify row_number() over (
      partition by event_id order by updated_at desc, ingest_seq desc
    ) = 1
  ) as incoming on dest.event_id = incoming.event_id
  when matched and (
    incoming.updated_at > dest.updated_at or
    (incoming.updated_at = dest.updated_at and incoming.ingest_seq > dest.ingest_seq)
  ) then update set updated_at = incoming.updated_at, ingest_seq = incoming.ingest_seq,
                    amount = incoming.amount
  when not matched then insert (event_id, updated_at, ingest_seq, amount)
    values (incoming.event_id, incoming.updated_at, incoming.ingest_seq, incoming.amount);
  return 'Merge complete';
end;
$$;
