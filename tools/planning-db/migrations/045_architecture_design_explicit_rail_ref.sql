do $$
begin
  if exists (
    select 1
    from architecture.design
    where lower(btrim(rail_ref)) in (
      'none',
      'n/a',
      'not-applicable',
      'none - architecture-authority-only'
    )
  ) then
    raise exception
      'architecture.design contains implicit rail_ref rows; repair them with an explicit governing rail before applying migration 045.'
      using errcode = '23514';
  end if;
end $$;

alter table architecture.design
  alter column rail_ref drop default;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'architecture_design_explicit_rail_ref_check'
  ) then
    alter table architecture.design
      add constraint architecture_design_explicit_rail_ref_check check (
        btrim(rail_ref) <> ''
        and lower(btrim(rail_ref)) not in (
          'none',
          'n/a',
          'not-applicable',
          'none - architecture-authority-only'
        )
      );
  end if;
end $$;
