"""Execute the independent Ibis/DataFrame-to-Substrait convergence proof."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import sys
import time
from pathlib import Path
from typing import Any

from ibis_producer import build_ibis_plans
from run_spike import (
    _consumer_results,
    _error,
    _plan_fingerprint,
    _save_plan,
    _validator_results,
    _write_json,
)
from sqlglot_producer import BoundedSqlGlotProducer
from visual_producer import build_visual_plans


def _version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def _bytes(plan) -> bytes:
    return plan.SerializeToString(deterministic=True)


def _comparison(
    case_id: str,
    ibis_plan,
    sql_plan,
    visual_plan,
) -> dict[str, Any]:
    ibis_fingerprint = _plan_fingerprint(ibis_plan)
    sql_fingerprint = _plan_fingerprint(sql_plan) if sql_plan is not None else None
    visual_fingerprint = (
        _plan_fingerprint(visual_plan) if visual_plan is not None else None
    )
    return {
        "caseId": case_id,
        "ibis": ibis_fingerprint,
        "sqlglot": sql_fingerprint,
        "visual": visual_fingerprint,
        "ibisEqualsSqlglotBinary": (
            _bytes(ibis_plan) == _bytes(sql_plan) if sql_plan is not None else None
        ),
        "ibisEqualsVisualBinary": (
            _bytes(ibis_plan) == _bytes(visual_plan) if visual_plan is not None else None
        ),
        "ibisEqualsSqlglotStructure": (
            ibis_fingerprint["structuralSha256"]
            == sql_fingerprint["structuralSha256"]
            if sql_fingerprint is not None
            else None
        ),
        "ibisEqualsVisualStructure": (
            ibis_fingerprint["structuralSha256"]
            == visual_fingerprint["structuralSha256"]
            if visual_fingerprint is not None
            else None
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--corpus",
        default=str(Path(__file__).parent / "fixtures" / "corpus.json"),
    )
    args = parser.parse_args()

    output = Path(args.output).resolve()
    corpus_path = Path(args.corpus).resolve()
    output.mkdir(parents=True, exist_ok=True)
    corpus = json.loads(corpus_path.read_text(encoding="utf-8"))

    started = time.perf_counter()
    try:
        ibis_plans = build_ibis_plans(corpus["tables"])
    except BaseException as error:
        _write_json(output / "ibis-producer.json", [{"status": "producer-error", "error": _error(error)}])
        raise

    visual_plans = build_visual_plans(corpus["tables"])
    sqlglot = BoundedSqlGlotProducer(corpus["tables"])
    case_by_id = {case["id"]: case for case in corpus["cases"]}

    plans: list[dict[str, Any]] = []
    producer_results: list[dict[str, Any]] = []
    comparisons: list[dict[str, Any]] = []

    visual_by_case = {
        item["caseId"]: item["plan"] for item in visual_plans.values()
    }

    for name, item in ibis_plans.items():
        case_id = item["caseId"]
        plan = item["plan"]
        record = _save_plan(output, f"ibis-{name}", case_id, plan, plans)
        producer_results.append(
            {
                "name": name,
                "caseId": case_id,
                "status": "produced",
                "fingerprint": record["fingerprint"],
            }
        )

        sql_plan = None
        sql_error = None
        try:
            sql_plan = sqlglot.produce(case_by_id[case_id]["sql"]).plan
        except BaseException as error:
            sql_error = _error(error)

        comparison = _comparison(
            case_id,
            plan,
            sql_plan,
            visual_by_case.get(case_id),
        )
        comparison["sqlglotError"] = sql_error
        comparisons.append(comparison)

    _write_json(output / "ibis-producer.json", producer_results)
    _write_json(output / "frontend-comparison.json", comparisons)
    _write_json(output / "plans.json", plans)

    validators = _validator_results(plans)
    consumers = _consumer_results(plans, corpus_path)
    _write_json(output / "validator.json", validators)
    _write_json(output / "duckdb-consumer.json", consumers)

    environment = {
        "python": sys.version,
        "packages": {
            "ibis-framework": _version("ibis-framework"),
            "ibis-substrait": _version("ibis-substrait"),
            "substrait": _version("substrait"),
            "substrait-protobuf": _version("substrait-protobuf"),
            "sqlglot": _version("sqlglot"),
            "duckdb": _version("duckdb"),
        },
        "milliseconds": round((time.perf_counter() - started) * 1000, 3),
    }
    _write_json(output / "environment.json", environment)

    summary = {
        "produced": len(producer_results),
        "validatorAccepted": sum(item.get("status") == "accepted" for item in validators),
        "consumerEquivalent": sum(item.get("status") == "equivalent" for item in consumers),
        "binaryEqualToVisual": sum(
            item.get("ibisEqualsVisualBinary") is True for item in comparisons
        ),
        "structurallyEqualToVisual": sum(
            item.get("ibisEqualsVisualStructure") is True for item in comparisons
        ),
        "binaryEqualToSqlglot": sum(
            item.get("ibisEqualsSqlglotBinary") is True for item in comparisons
        ),
        "structurallyEqualToSqlglot": sum(
            item.get("ibisEqualsSqlglotStructure") is True for item in comparisons
        ),
        "planDigests": {
            item["caseId"]: hashlib.sha256(
                Path(item["binaryPath"]).read_bytes()
            ).hexdigest()
            for item in plans
        },
    }
    _write_json(output / "summary.json", summary)
    print(json.dumps(summary, sort_keys=True))

    if len(producer_results) != 5:
        raise RuntimeError("Ibis producer did not generate every selected fixture")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
