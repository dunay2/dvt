"""Build representative card/visual semantics directly as Substrait plans.

This is not a DVT authoring model. It is a controlled proof that a non-SQL
frontend can emit the same standard semantic relations without defining private
Filter/Join/Aggregate classes.
"""

from __future__ import annotations

from typing import Any

import substrait.dataframe as sub


_DTYPE = {
    "i64": sub.i64,
    "fp64": sub.fp64,
    "string": sub.string,
    "boolean": sub.boolean,
    "date": sub.date,
    # The selected visual fixtures do not transform these fields. Encoding them
    # as strings keeps the named-table schema complete without inventing a DVT
    # timestamp/JSON/list type system in this spike.
    "timestamp": sub.string,
    "json": sub.string,
    "list_i64": sub.string,
}


def _read(tables: dict[str, dict[str, Any]], name: str):
    schema = {}
    for column in tables[name]["columns"]:
        dtype = _DTYPE[column["type"]]
        schema[column["name"]] = (
            dtype.nullable if column.get("nullable", True) else dtype.non_null
        )
    return sub.read_named_table(name, schema)


def build_visual_plans(tables: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    customers = _read(tables, "customers")
    orders = _read(tables, "orders")
    order_items = _read(tables, "order_items")
    products = _read(tables, "products")

    filter_project = (
        customers.filter(sub.col("active") == 1)
        .select("customer_id", "customer_name")
        .sort("customer_id")
        .to_plan()
    )

    single_join = (
        customers.join(
            orders,
            on=sub.col("customer_id") == sub.col("order_customer_id"),
            how="inner",
        )
        .filter(sub.col("order_amount") > 10)
        .select("customer_name", "order_amount")
        .sort("order_amount")
        .to_plan()
    )

    three_joins = (
        customers.join(
            orders,
            on=sub.col("customer_id") == sub.col("order_customer_id"),
            how="inner",
        )
        .join(
            order_items,
            on=sub.col("order_id") == sub.col("item_order_id"),
            how="inner",
        )
        .join(
            products,
            on=sub.col("product_id") == sub.col("product_id_ref"),
            how="inner",
        )
        .filter(sub.col("quantity") > 0)
        .select("customer_name", "product_name", "quantity")
        .sort("customer_name", "product_name")
        .to_plan()
    )

    aggregate = (
        orders.filter(sub.col("order_amount") > 0)
        .group_by("order_customer_id")
        .agg(sub.f.sum(sub.col("order_amount")).alias("revenue"))
        .filter(sub.col("revenue") > 20)
        .select("order_customer_id", "revenue")
        .sort("order_customer_id")
        .to_plan()
    )

    sort_fetch = (
        orders.select("order_id")
        .sort("order_id")
        .limit(2, offset=1)
        .to_plan()
    )

    return {
        "filter_project": {"caseId": "filter_project", "plan": filter_project},
        "single_join": {"caseId": "single_join", "plan": single_join},
        "three_joins": {"caseId": "three_joins", "plan": three_joins},
        "aggregate": {"caseId": "aggregate_having", "plan": aggregate},
        "sort_fetch": {"caseId": "sort_fetch", "plan": sort_fetch},
    }
