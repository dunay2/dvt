with ranked as (
  select event_id, updated_at, ingest_seq, amount,
         row_number() over (
           partition by event_id order by updated_at desc nulls last, ingest_seq desc nulls last
         ) as row_rank
  from [[modelRelation]]
)
select event_id, updated_at, ingest_seq, amount
from ranked
where row_rank = 1
