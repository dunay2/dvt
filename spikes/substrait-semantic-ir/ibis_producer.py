"""Compile representative DataFrame expressions with ibis-substrait.

This producer is intentionally independent from both the bounded SQLGlot
adapter and the direct Substrait DataFrame builder used by ``visual_producer``.
It tests the core hypothesis that a mature Python/DataFrame frontend can converge
on the same standard semantic plan without a DVT-owned relational AST.
"""

from __future__ import annotations

from typing import Any

import ibis
from ibis_substrait.compiler.core import SubstraitCompiler


_IBIS_TYPES = {
    "i64": "int64",
    "fp64": "float64",
    "string": "string",
    "boolean": "boolean",
    "date": "date",
    "timestamp": "timestamp",
    # These compound/provider cases are outside the selected Ibis convergence
    # fixtures. Keeping named-table schemas complete must not be interpreted as
    # a claim that JSON/list semantics are portable strings.
    "json": "string",
    "list_i64": "array<int64>",
}


def _table(tables: dict[str, dict[str, Any]], name: str):
    schema = {
        column["name"]: _IBIS_TYPES[column["type"]]
        for column in tables[name]["columns"]
    }
    return ibis.table(schema, name=name)


def _compile(expression):
    # Compiler state owns extension anchors, so isolate every fixture to ensure
    # deterministic, self-contained plans.
    return SubstraitCompiler().compile(expression)


def build_ibis_plans(tables: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    customers = _table(tables, "customers")
    orders = _table(tables, "orders")
    order_items = _table(tables, "order_items")
    products = _table(tables, "products")

    filter_project = (
        customers.filter(customers.active == 1)
        .select(customers.customer_id, customers.customer_name)
        .order_by("customer_id")
    )

    single_join_relation = customers.join(
        orders,
        customers.customer_id == orders.order_customer_id,
        how="inner",
    )
    single_join = (
        single_join_relation.filter(single_join_relation.order_amount > 10)
        .select(
            single_join_relation.customer_name,
            single_join_relation.order_amount,
        )
        .order_by("order_amount")
    )

    customers_orders = customers.join(
        orders,
        customers.customer_id == orders.order_customer_id,
        how="inner",
    )
    with_items = customers_orders.join(
        order_items,
        customers_orders.order_id == order_items.item_order_id,
        how="inner",
    )
    with_products = with_items.join(
        products,
        with_items.product_id == products.product_id_ref,
        how="inner",
    )
    three_joins = (
        with_products.filter(with_products.quantity > 0)
        .select(
            with_products.customer_name,
            with_products.product_name,
            with_products.quantity,
        )
        .order_by("customer_name", "product_name")
    )

    positive_orders = orders.filter(orders.order_amount > 0)
    aggregate_relation = positive_orders.group_by(
        positive_orders.order_customer_id
    ).aggregate(revenue=positive_orders.order_amount.sum())
    aggregate = (
        aggregate_relation.filter(aggregate_relation.revenue > 20)
        .select(
            aggregate_relation.order_customer_id,
            aggregate_relation.revenue,
        )
        .order_by("order_customer_id")
    )

    sort_fetch = orders.select(orders.order_id).order_by("order_id").limit(2, offset=1)

    return {
        "filter_project": {
            "caseId": "filter_project",
            "plan": _compile(filter_project),
        },
        "single_join": {
            "caseId": "single_join",
            "plan": _compile(single_join),
        },
        "three_joins": {
            "caseId": "three_joins",
            "plan": _compile(three_joins),
        },
        "aggregate": {
            "caseId": "aggregate_having",
            "plan": _compile(aggregate),
        },
        "sort_fetch": {
            "caseId": "sort_fetch",
            "plan": _compile(sort_fetch),
        },
    }
