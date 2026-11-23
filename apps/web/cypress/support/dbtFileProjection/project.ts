/** A real dbt project shared by the file-authoritative Canvas journeys. */
import { visitWithLiveWorkspaceSession } from '../liveProtectedRuntime';

export const PROJECT_ROOT = 'analytics-file-projection';
export const INVALID_PROJECT_ROOT = 'analytics-invalid';
export const CANVAS_ID = 'analytics-file-projection-files';
export const INVALID_CANVAS_ID = 'analytics-invalid-files';

export const INVALID_PROJECT_CONFIG = `
name: analytics_invalid
version: '1.0.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['../outside-project']
`;

export const PROJECT_FILES: Readonly<Record<string, string>> = {
  [`${PROJECT_ROOT}/dbt_project.yml`]: `
name: analytics
version: '1.0.0'
config-version: 2
profile: dvt_live_proof
model-paths: ['models']
seed-paths: ['seeds']
snapshot-paths: ['snapshots']
clean-targets: ['target', 'dbt_packages']
`,
  [`${PROJECT_ROOT}/models/schema.yml`]: `
version: 2
sources:
  - name: raw
    schema: public
    tables:
      - name: orders
        description: Governed order intake
        columns:
          - name: order_id
            data_type: integer
            description: Stable order identifier
          - name: customer_id
            data_type: text
models:
  - name: orders
    description: Curated orders model
    columns:
      - name: order_id
        data_type: integer
        tests:
          - not_null
          - unique
      - name: customer_id
        data_type: text
exposures:
  - name: orders_dashboard
    label: Orders dashboard
    type: dashboard
    maturity: high
    url: https://example.invalid/orders
    depends_on:
      - ref('orders')
    owner:
      name: Analytics
      email: analytics@example.invalid
`,
  [`${PROJECT_ROOT}/models/orders.sql`]: `
select
  1::integer as order_id,
  'customer-1'::text as customer_id
from {{ source('raw', 'orders') }}
`,
  [`${PROJECT_ROOT}/seeds/country_codes.csv`]: `code,name
ES,Spain
PT,Portugal
`,
  [`${PROJECT_ROOT}/snapshots/orders_snapshot.sql`]: `
{% snapshot orders_snapshot %}
{{ config(target_schema='snapshots', unique_key='order_id', strategy='check', check_cols=['customer_id']) }}
select * from {{ ref('orders') }}
{% endsnapshot %}
`,
};

export function visitProjectCanvas(
  url = `/canvas?authority=dbt-project-files&canvasId=${CANVAS_ID}&projectRoot=${PROJECT_ROOT}`
): void {
  visitWithLiveWorkspaceSession(url, {
    onBeforeLoad(window) {
      window.localStorage.setItem(
        'dvt-web-application-language',
        JSON.stringify({ state: { language: 'en' }, version: 0 })
      );
    },
  });
}

export function assertFileAuthority(requests: readonly string[]): void {
  cy.wrap(null).should(() => {
    expect(requests.some((url) => url.includes('/workspace/dbt/graph?'))).to.equal(true);
  });
  cy.window().should((window) => {
    expect(
      window.performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.includes('/workspace/graph/draft')),
      'no graph-draft request during file-authoritative rendering'
    ).to.equal(false);
  });
}
