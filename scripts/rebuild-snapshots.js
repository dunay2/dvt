#!/usr/bin/env node
/*
  Backfill utility: rebuild `run_snapshots` by replaying `run_events` per run.
  Usage: DATABASE_URL=postgres://user:pass@host:port/db node scripts/rebuild-snapshots.js [--dry-run] [--batch 100]
*/
import pg from 'pg';

const { Client } = pg;

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const batchArg = (() => {
  const i = argv.indexOf('--batch');
  if (i === -1) return 100;
  return Number(argv[i + 1]) || 100;
})();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Please set DATABASE_URL env var');
  process.exit(2);
}

function applyRunEvent(snap, e) {
  switch (e.event_type) {
    case 'RunQueued':
      break;
    case 'RunStarted':
      snap.status = 'RUNNING';
      snap.startedAt = snap.startedAt ?? e.emitted_at;
      break;
    case 'RunPaused':
      snap.status = 'PAUSED';
      snap.paused = true;
      break;
    case 'RunResumed':
      snap.status = 'RUNNING';
      snap.paused = false;
      break;
    case 'RunCancelled':
      snap.status = 'CANCELLED';
      snap.completedAt = e.emitted_at;
      break;
    case 'RunCompleted':
      snap.status = 'COMPLETED';
      snap.completedAt = e.emitted_at;
      break;
    case 'RunFailed':
      snap.status = 'FAILED';
      snap.completedAt = e.emitted_at;
      break;
    case 'StepStarted': {
      const stepId = e.step_id;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'RUNNING';
      s.startedAt = s.startedAt ?? e.emitted_at;
      s.attempts += 1;
      snap.steps[stepId] = s;
      break;
    }
    case 'StepCompleted': {
      const stepId = e.step_id;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'COMPLETED';
      s.completedAt = e.emitted_at;
      snap.steps[stepId] = s;
      break;
    }
    case 'StepFailed': {
      const stepId = e.step_id;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'FAILED';
      s.completedAt = e.emitted_at;
      snap.steps[stepId] = s;
      break;
    }
    case 'StepSkipped': {
      const stepId = e.step_id;
      const s = snap.steps[stepId] ?? { status: 'PENDING', attempts: 0 };
      s.status = 'SKIPPED';
      s.completedAt = e.emitted_at;
      snap.steps[stepId] = s;
      break;
    }
    default:
      // ignore unknown types
      break;
  }
  return snap;
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('Connected to DB, starting backfill...');

  // Count runs
  const resCount = await client.query(`SELECT COUNT(DISTINCT run_id) AS cnt FROM run_events`);
  const totalRuns = Number(resCount.rows[0]?.cnt || 0);
  console.log(`Found ${totalRuns} distinct runs`);

  let processed = 0;
  let offset = 0;
  while (true) {
    const rows = await client.query(
      `SELECT DISTINCT run_id FROM run_events ORDER BY run_id LIMIT $1 OFFSET $2`,
      [batchArg, offset]
    );
    if (!rows || rows.rows.length === 0) break;
    for (const r of rows.rows) {
      const runId = r.run_id;
      // fetch events
      const ev = await client.query(
        `SELECT * FROM run_events WHERE run_id = $1 ORDER BY run_seq ASC`,
        [runId]
      );
      const events = ev.rows;

      const snap = { runId, status: 'PENDING', paused: false, steps: {} };
      let lastSeq = 0;
      for (const e of events) {
        applyRunEvent(snap, e);
        if (typeof e.run_seq === 'number') lastSeq = e.run_seq;
      }

      if (dryRun) {
        console.log('[dry-run] upsert', runId, 'events', events.length, 'lastSeq', lastSeq);
      } else {
        // upsert into run_snapshots
        await client.query('BEGIN');
        try {
          await client.query(
            `INSERT INTO run_snapshots (run_id, snapshot, last_run_seq, updated_at)
             VALUES ($1, $2::jsonb, $3, now())
             ON CONFLICT (run_id) DO UPDATE SET snapshot = EXCLUDED.snapshot, last_run_seq = EXCLUDED.last_run_seq, updated_at = EXCLUDED.updated_at`,
            [runId, JSON.stringify(snap), lastSeq]
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          console.error('Failed to upsert snapshot for', runId, err);
        }
      }

      processed += 1;
      if (processed % 50 === 0) console.log(`Processed ${processed}/${totalRuns}`);
    }
    offset += batchArg;
  }

  console.log(`Done. Processed ${processed} runs.`);
  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
