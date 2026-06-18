-- Correct the Canvas architecture evidence path used by the Web component
-- integrity follow-up. The tracked file is TSX, not TS.

update architecture.component
set
  repo_path = 'apps/web/src/app/views/Canvas.architecture.test.tsx',
  updated_at = now()
where component_id = 'SYS-WEB-VIEW-CANVAS'
  and repo_path = 'apps/web/src/app/views/Canvas.architecture.test.ts';
