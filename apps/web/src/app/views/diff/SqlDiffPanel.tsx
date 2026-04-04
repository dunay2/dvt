import { Code } from 'lucide-react';

import { Card } from '../../components/ui/card';
import { diffViewCopy as copy } from './copy';

const sqlOld = `SELECT
  o.order_id,
  o.customer_id,
  o.order_date,
  s.store_id,
  o.total_amount,
  o.discount_amount
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('dim_store') }} s
  ON o.store_id = s.store_id`;

const sqlNew = `SELECT
  o.order_id,
  o.customer_id,
  o.order_date,
  s.store_id,
  o.total_amount
FROM {{ ref('stg_orders') }} o
LEFT JOIN {{ ref('dim_store') }} s
  ON o.store_id = s.store_id
WHERE o.order_date >= '2020-01-01'`;

export function SqlDiffPanel() {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4 text-slate-50">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-50">
        <Code className="size-5" />
        {copy.sql.title}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2 text-xs text-slate-300">{copy.sql.old}</div>
          <pre className="max-h-[400px] overflow-auto rounded border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-50">
            {sqlOld}
          </pre>
        </div>
        <div>
          <div className="mb-2 text-xs text-slate-300">{copy.sql.next}</div>
          <pre className="max-h-[400px] overflow-auto rounded border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-50">
            {sqlNew}
          </pre>
        </div>
      </div>
    </Card>
  );
}
