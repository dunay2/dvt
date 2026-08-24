"""Bounded SQLGlot-to-Substrait producer used only by the architecture spike.

The producer intentionally supports a small, explicit subset. Every unsupported
construct raises ``NotRepresentable``; it never drops syntax or silently changes
meaning. The resulting plan is built through the upstream Substrait DataFrame
API, so this module measures adapter work rather than defining another IR.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import sqlglot
from sqlglot import exp
import substrait.dataframe as sub


class NotRepresentable(ValueError):
    """The SQL AST contains semantics outside this bounded producer."""


@dataclass(frozen=True)
class ProducedPlan:
    plan: Any
    sqlglot_ast: exp.Expression
    supported_features: tuple[str, ...]


class BoundedSqlGlotProducer:
    """Compile a measured SQLGlot subset directly into a Substrait plan."""

    _DTYPES = {
        "i64": sub.i64,
        "fp64": sub.fp64,
        "string": sub.string,
        "boolean": sub.boolean,
        "date": sub.date,
    }

    def __init__(self, tables: dict[str, dict[str, Any]]) -> None:
        self._tables = tables
        self._features: set[str] = set()

    def produce(self, sql: str, dialect: str = "postgres") -> ProducedPlan:
        tree = sqlglot.parse_one(sql, read=dialect)
        self._features = set()

        if not isinstance(tree, exp.Select):
            raise NotRepresentable(
                f"root {type(tree).__name__} is outside the bounded SELECT producer"
            )
        if tree.args.get("with_") is not None:
            raise NotRepresentable("WITH/CTE binding is not implemented by this spike producer")

        frame = self._from_and_joins(tree)

        where = tree.args.get("where")
        if where is not None:
            frame = frame.filter(self._expression(where.this))
            self._features.add("FilterRel")

        group = tree.args.get("group")
        has_aggregate = group is not None or any(
            expression.find(exp.AggFunc) is not None for expression in tree.expressions
        )
        if has_aggregate:
            frame = self._aggregate(tree, frame)
        else:
            frame = self._project(tree, frame)

        order = tree.args.get("order")
        if order is not None:
            keys: list[str] = []
            descending: list[bool] = []
            nulls_last: list[bool] = []
            for ordered in order.expressions:
                target = ordered.this
                if not isinstance(target, exp.Column):
                    raise NotRepresentable(
                        "bounded ordering supports only output column references"
                    )
                keys.append(target.name)
                descending.append(bool(ordered.args.get("desc")))
                nulls_last.append(not bool(ordered.args.get("nulls_first")))
            frame = frame.sort(
                *keys, descending=descending, nulls_last=nulls_last
            )
            self._features.add("SortRel")

        limit = tree.args.get("limit")
        offset = tree.args.get("offset")
        if limit is not None or offset is not None:
            count = self._integer_literal(limit.expression) if limit is not None else None
            skip = self._integer_literal(offset.expression) if offset is not None else 0
            if count is None:
                frame = frame.offset(skip)
            else:
                frame = frame.limit(count, offset=skip)
            self._features.add("FetchRel")

        return ProducedPlan(
            plan=frame.to_plan(),
            sqlglot_ast=tree,
            supported_features=tuple(sorted(self._features)),
        )

    def _from_and_joins(self, select: exp.Select):
        from_clause = select.args.get("from_")
        if from_clause is None or not isinstance(from_clause.this, exp.Table):
            raise NotRepresentable("one named table is required at the FROM root")

        frame = self._read_table(from_clause.this)
        self._features.add("ReadRel")

        for join in select.args.get("joins") or []:
            if not isinstance(join.this, exp.Table):
                raise NotRepresentable("bounded joins require a named right table")
            condition = join.args.get("on")
            if condition is None:
                raise NotRepresentable("bounded joins require an explicit ON predicate")
            side = (join.args.get("side") or "").upper()
            kind = (join.args.get("kind") or "").upper()
            how = {
                "": "inner",
                "INNER": "inner",
                "LEFT": "left",
                "RIGHT": "right",
                "FULL": "outer",
                "OUTER": "outer",
            }.get(side or kind)
            if how is None:
                raise NotRepresentable(
                    f"join side/kind {side or kind!r} is outside the bounded mapping"
                )
            frame = frame.join(
                self._read_table(join.this),
                on=self._expression(condition),
                how=how,
            )
            self._features.add("JoinRel")
        return frame

    def _read_table(self, table: exp.Table):
        name = table.name
        try:
            table_spec = self._tables[name]
        except KeyError as error:
            raise NotRepresentable(f"unknown table {name!r}") from error

        schema: dict[str, Any] = {}
        for column in table_spec["columns"]:
            dtype_name = column["type"]
            try:
                dtype = self._DTYPES[dtype_name]
            except KeyError as error:
                raise NotRepresentable(
                    f"table {name!r} uses unsupported spike type {dtype_name!r}"
                ) from error
            schema[column["name"]] = (
                dtype.nullable if column.get("nullable", True) else dtype.non_null
            )
        return sub.read_named_table(name, schema)

    def _project(self, select: exp.Select, frame):
        expressions: list[Any] = []
        for projection in select.expressions:
            alias = projection.alias_or_name
            source = projection.this if isinstance(projection, exp.Alias) else projection
            if isinstance(source, exp.Star):
                raise NotRepresentable("wildcard projection is not expanded by this producer")
            translated = self._expression(source)
            if alias and not (isinstance(source, exp.Column) and alias == source.name):
                translated = translated.alias(alias)
            expressions.append(translated)
        self._features.add("ProjectRel")
        return frame.select(*expressions)

    def _aggregate(self, select: exp.Select, frame):
        if select.args.get("having") is not None:
            raise NotRepresentable(
                "post-aggregate HAVING mapping is measured through the upstream producer"
            )
        group = select.args.get("group")
        group_names: list[str] = []
        if group is not None:
            for key in group.expressions:
                if not isinstance(key, exp.Column):
                    raise NotRepresentable("bounded grouping supports only columns")
                group_names.append(key.name)

        measures: list[Any] = []
        output_names: list[str] = list(group_names)
        for projection in select.expressions:
            alias = projection.alias_or_name
            source = projection.this if isinstance(projection, exp.Alias) else projection
            if isinstance(source, exp.Column):
                if source.name not in group_names:
                    raise NotRepresentable(
                        f"non-grouped column {source.name!r} appears in aggregate output"
                    )
                continue
            measure = self._aggregate_expression(source)
            if not alias:
                raise NotRepresentable("aggregate outputs require an explicit alias")
            measures.append(measure.alias(alias))
            output_names.append(alias)

        frame = frame.group_by(*group_names).agg(*measures)
        self._features.add("AggregateRel")
        self._features.add("ProjectRel")
        return frame.select(*output_names)

    def _aggregate_expression(self, expression: exp.Expression):
        if isinstance(expression, exp.Sum):
            return sub.f.sum(self._expression(expression.this))
        if isinstance(expression, exp.Count):
            if isinstance(expression.this, exp.Star):
                raise NotRepresentable("COUNT(*) is not mapped by the bounded producer")
            return sub.f.count(self._expression(expression.this))
        raise NotRepresentable(
            f"aggregate {type(expression).__name__} is outside the bounded mapping"
        )

    def _expression(self, expression: exp.Expression):
        if isinstance(expression, exp.Paren):
            return self._expression(expression.this)
        if isinstance(expression, exp.Column):
            return sub.col(expression.name)
        if isinstance(expression, exp.Literal):
            if expression.is_string:
                return sub.lit(expression.this)
            if expression.is_int:
                return sub.lit(int(expression.this))
            return sub.lit(float(expression.this))
        if isinstance(expression, exp.Boolean):
            return sub.lit(bool(expression.this))

        binary_operators = {
            exp.EQ: lambda left, right: left == right,
            exp.NEQ: lambda left, right: left != right,
            exp.GT: lambda left, right: left > right,
            exp.GTE: lambda left, right: left >= right,
            exp.LT: lambda left, right: left < right,
            exp.LTE: lambda left, right: left <= right,
            exp.Add: lambda left, right: left + right,
            exp.Sub: lambda left, right: left - right,
            exp.Mul: lambda left, right: left * right,
            exp.Div: lambda left, right: left / right,
            exp.And: lambda left, right: left & right,
            exp.Or: lambda left, right: left | right,
        }
        for expression_type, operator in binary_operators.items():
            if isinstance(expression, expression_type):
                return operator(
                    self._expression(expression.left),
                    self._expression(expression.right),
                )

        if isinstance(expression, exp.Not):
            return ~self._expression(expression.this)

        raise NotRepresentable(
            f"expression {type(expression).__name__} is outside the bounded mapping"
        )

    @staticmethod
    def _integer_literal(expression: exp.Expression) -> int:
        if not isinstance(expression, exp.Literal) or not expression.is_int:
            raise NotRepresentable("Fetch count/offset must be an integer literal")
        return int(expression.this)
