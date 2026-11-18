create task [[taskName]]
  warehouse = [[warehouse]]
  schedule = '[[schedule]]'
as call [[extractProcedure]]();

create task [[taskName]]_load
  warehouse = [[warehouse]]
  after [[taskName]]
as call [[loadProcedure]]();

create task [[taskName]]_check
  warehouse = [[warehouse]]
  after [[taskName]]_load
as call [[checkProcedure]]();
