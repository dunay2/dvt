create task [[taskName]]
  warehouse = [[warehouse]]
  schedule = '[[schedule]]'
as call [[extractProcedure]]();

create task [[taskName]]_left
  warehouse = [[warehouse]]
  after [[taskName]]
as call [[leftProcedure]]();

create task [[taskName]]_right
  warehouse = [[warehouse]]
  after [[taskName]]
as call [[rightProcedure]]();

create task [[taskName]]_publish
  warehouse = [[warehouse]]
  after [[taskName]]_left, [[taskName]]_right
as call [[loadProcedure]]();
