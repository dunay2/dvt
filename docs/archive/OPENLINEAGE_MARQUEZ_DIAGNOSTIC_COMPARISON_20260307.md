---
title: OpenLineage and Marquez Diagnostic Comparison
status: Archived
owner: docs
last_reviewed: 2026-03-07
planning_type: archive
---

# Critical Review: OpenLineage + Marquez vs DVT Design

Take your design, place it next to OpenLineage + Marquez, and observe how 90% of your pain disappears. It's not that they're compatible; it's that they already executed your thesis, battle-tested it, and packaged it as an open standard.

I evaluate each of your 7 points against the reality of these tools, with concrete code and event examples.

## 1. Partial Catalog (docs generate --select) → OpenLineage solves it with facets

Your diagnosis: The catalog.json can be partial, and a naive UI would show "does not exist" when in reality the data does exist but was not selected.

OpenLineage's solution: It does not depend on catalog.json. The dbt-ol wrapper (or openlineage-dbt) runs dbt docs generate before emitting events, and extracts column schemas from the generated catalog.json for executed models. But the key point: OpenLineage models column schemas as a facet of the dataset, not as a separate artifact.

Concrete example: When you run dbt-ol, for each output dataset an event like this is emitted, including the schema facet with the actual columns produced by that model:

```json
{
  "eventType": "COMPLETE",
  "outputs": [
    {
      "namespace": "snowflake://my_account",
      "name": "analytics.dim_customers",
      "facets": {
        "schema": {
          "_producer": "https://github.com/OpenLineage/OpenLineage/tree/1.0/integration/dbt",
          "_schemaURL": "https://openlineage.io/spec/facets/1-0-0/SchemaDatasetFacet.json",
          "fields": [
            { "name": "customer_id", "type": "NUMBER" },
            { "name": "customer_name", "type": "VARCHAR" },
            { "name": "first_order_date", "type": "DATE" }
          ]
        }
      }
    }
  ]
}
```

Your fear of "false negatives" disappears: If a model was not executed (due to --select), there is no event, no dataset in Marquez. If it was executed but catalog.json was not generated, the schema facet simply does not appear, and the UI shows "no column metadata" unambiguously. There is no room for "does not exist" vs "partial".

## 2. Identity: versions + access + contracts → OpenLineage handles it with Job versioning

Your insight: You cannot use unique_id directly, and model versions must be separate entities.

How OpenLineage does it: The identity of a Job in OpenLineage is the tuple (namespace, name). For versioned models, you generate distinct names: dim_customers_v1, dim_customers_v2. The dbt-ol wrapper already does this: it takes the dbt unique_id and transforms it into a stable Job name, preserving the version.

Example:

Model dim_customers version 1 in dbt → unique_id = "model.my_project.dim_customers.v1"
