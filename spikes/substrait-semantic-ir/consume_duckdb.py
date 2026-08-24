"""Consume one plan in a separate process so native failures remain evidence."""

from __future__ import annotations

import argparse
import datetime as dt
import decimal
import json
import math
from pathlib import Path
from typing import Any

import duckdb


_DUCKDB_TYPES = {
    "i64": "BIGINT",
    "fp64": "DOUBLE",
    "string": "VARCHAR",
    "boolean": "BOOLEAN",
    "date": "DATE",
    # The spike's logical core does not transform this field. Keeping it VARCHAR
    # aligns with the producer's bounded schema without claiming timezone fidelity.
    "timestamp": "VARCHAR",
    "json": "VARCHAR",
    "list_i64": "BIGINT[]",
}


def _quote(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _load_tables(connection, tables: dict[str, Any]) -> None:
    for table_name, table in tables.items():
        definitions = ", ".join(
            f"{_quote(column['name'])} {_DUCKDB_TYPES[column['type']]}"
            for column in table["columns"]
        )
        connection.execute(f"CREATE TABLE {_quote(table_name)} ({definitions})")
        if table["rows"]:
            placeholders = ", ".join("?" for _ in table["columns"])
            connection.executemany(
                f"INSERT INTO {_quote(table_name)} VALUES ({placeholders})",
                table["rows"],
            )


def _value(value: Any) -> Any:
    if isinstance(value, decimal.Decimal):
        return format(value, "f")
    if isinstance(value, (dt.datetime, dt.date, dt.time)):
        return value.isoformat()
    if isinstance(value, bytes):
        return value.hex()
    if isinstance(value, float):
        if math.isnan(value):
            return "NaN"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        return round(value, 12)
    if isinstance(value, (list, tuple)):
        return [_value(item) for item in value]
    return value


def _rows(rows: list[tuple[Any, ...]], ordered: bool) -> list[list[Any]]:
    normalized = [[_value(value) for value in row] for row in rows]
    if not ordered:
        normalized.sort(key=lambda row: json.dumps(row, sort_keys=True, default=str))
    return normalized


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", required=True)
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--case", required=True)
    args = parser.parse_args()

    corpus = json.loads(Path(args.corpus).read_text(encoding="utf-8"))
    case = next(item for item in corpus["cases"] if item["id"] == args.case)
    plan_bytes = Path(args.plan).read_bytes()

    connection = duckdb.connect(":memory:")
    try:
        _load_tables(connection, corpus["tables"])
        connection.execute("INSTALL substrait FROM community")
        connection.execute("LOAD substrait")

        plan_rows = connection.sql(
            "CALL from_substrait(?)", params=[plan_bytes]
        ).fetchall()
        normalized_plan = _rows(plan_rows, bool(case.get("ordered")))

        if case.get("duckdbComparable", True):
            sql_rows = connection.sql(case["sql"]).fetchall()
            normalized_sql = _rows(sql_rows, bool(case.get("ordered")))
            equivalent = normalized_plan == normalized_sql
            comparison = "equivalent" if equivalent else "different"
        else:
            normalized_sql = None
            equivalent = None
            comparison = "not-requested"

        print(
            json.dumps(
                {
                    "duckdbVersion": duckdb.__version__,
                    "caseId": case["id"],
                    "planRows": normalized_plan,
                    "sqlRows": normalized_sql,
                    "comparison": comparison,
                    "equivalent": equivalent,
                },
                sort_keys=True,
            )
        )
        return 0 if equivalent is not False else 2
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
