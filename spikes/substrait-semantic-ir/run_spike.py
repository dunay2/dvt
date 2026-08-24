"""Execute the isolated Substrait semantic IR architecture spike.

The script records successes, unsupported cases, version mismatches and native
consumer failures as evidence. Unsupported language constructs do not fail the
run; inability to produce any representative plan or loss of the identity
sidecar invariants does.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import resource
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import sqlglot
from google.protobuf.json_format import MessageToJson
from substrait import type_pb2 as stt
from substrait.extension_registry import ExtensionRegistry
from substrait.sql.sql_to_substrait import convert as upstream_sql_to_substrait

from identity_sidecar import run_identity_experiment
from sqlglot_producer import BoundedSqlGlotProducer, NotRepresentable
from visual_producer import build_visual_plans


RELATION_MESSAGES = {
    "ReadRel",
    "FilterRel",
    "ProjectRel",
    "JoinRel",
    "CrossRel",
    "LateralJoinRel",
    "AggregateRel",
    "SortRel",
    "FetchRel",
    "SetRel",
    "WriteRel",
    "DdlRel",
    "ExpandRel",
    "TopNRel",
    "ReferenceRel",
    "ExtensionLeafRel",
    "ExtensionSingleRel",
    "ExtensionMultiRel",
}

CONSUMER_CASES = {
    "filter_project",
    "single_join",
    "three_joins",
    "aggregate_having",
    "sort_fetch",
}


class SpikeError(RuntimeError):
    """The spike itself could not produce trustworthy evidence."""


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True, default=str) + "\n", encoding="utf-8")


def _error(error: BaseException) -> dict[str, str]:
    return {"type": type(error).__name__, "message": str(error)[:4000]}


def _package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def _distribution_size(name: str) -> int | None:
    try:
        distribution = importlib.metadata.distribution(name)
    except importlib.metadata.PackageNotFoundError:
        return None
    total = 0
    for entry in distribution.files or []:
        location = distribution.locate_file(entry)
        try:
            if location.is_file():
                total += location.stat().st_size
        except OSError:
            continue
    return total


def _measure_import(module: str) -> dict[str, Any]:
    start = time.perf_counter()
    result = subprocess.run(
        [sys.executable, "-c", f"import {module}"],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    return {
        "module": module,
        "milliseconds": round((time.perf_counter() - start) * 1000, 3),
        "returnCode": result.returncode,
        "stderr": result.stderr[-2000:],
    }


def _proto_type(column: dict[str, Any]) -> stt.Type:
    nullability = (
        stt.Type.NULLABILITY_NULLABLE
        if column.get("nullable", True)
        else stt.Type.NULLABILITY_REQUIRED
    )
    kind = column["type"]
    if kind == "i64":
        return stt.Type(i64=stt.Type.I64(nullability=nullability))
    if kind == "fp64":
        return stt.Type(fp64=stt.Type.FP64(nullability=nullability))
    if kind == "boolean":
        return stt.Type(bool=stt.Type.Boolean(nullability=nullability))
    if kind == "date":
        return stt.Type(date=stt.Type.Date(nullability=nullability))
    # The SQL producer is being measured for relational structure. Provider
    # timestamps, JSON and arrays remain explicit corpus cases and are not
    # silently claimed portable; their schema is represented as string here so
    # parsing can reach and report the actual unsupported expression/relation.
    return stt.Type(string=stt.Type.String(nullability=nullability))


def _schema_resolver(tables: dict[str, Any]):
    def resolve(name: str) -> stt.NamedStruct:
        if name not in tables:
            raise KeyError(f"unknown table {name!r}")
        columns = tables[name]["columns"]
        return stt.NamedStruct(
            names=[column["name"] for column in columns],
            struct=stt.Type.Struct(
                types=[_proto_type(column) for column in columns],
                nullability=stt.Type.NULLABILITY_REQUIRED,
            ),
        )

    return resolve


def _walk_message(message, relations: list[str]) -> None:
    descriptor_name = message.DESCRIPTOR.name
    if descriptor_name in RELATION_MESSAGES:
        relations.append(descriptor_name)
    for field, value in message.ListFields():
        if field.message_type is None:
            continue
        values = value if field.is_repeated else [value]
        for item in values:
            if hasattr(item, "ListFields"):
                _walk_message(item, relations)


def _plan_fingerprint(plan) -> dict[str, Any]:
    relations: list[str] = []
    _walk_message(plan, relations)
    functions = sorted(
        declaration.extension_function.name
        for declaration in plan.extensions
        if declaration.HasField("extension_function")
    )
    roots = [list(plan_rel.root.names) for plan_rel in plan.relations if plan_rel.HasField("root")]
    structure = {"relations": relations, "functions": functions, "rootNames": roots}
    binary = plan.SerializeToString(deterministic=True)
    return {
        **structure,
        "binarySha256": hashlib.sha256(binary).hexdigest(),
        "structuralSha256": hashlib.sha256(
            json.dumps(structure, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest(),
        "binaryBytes": len(binary),
    }


def _save_plan(
    output: Path,
    producer: str,
    case_id: str,
    plan,
    plans: list[dict[str, Any]],
) -> dict[str, Any]:
    stem = f"{producer}__{case_id}"
    binary_path = output / "plans" / f"{stem}.bin"
    json_path = output / "plans" / f"{stem}.json"
    binary_path.parent.mkdir(parents=True, exist_ok=True)
    binary_path.write_bytes(plan.SerializeToString(deterministic=True))
    json_path.write_text(
        MessageToJson(
            plan,
            preserving_proto_field_name=True,
            sort_keys=True,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    fingerprint = _plan_fingerprint(plan)
    record = {
        "producer": producer,
        "caseId": case_id,
        "binaryPath": str(binary_path),
        "jsonPath": str(json_path),
        "fingerprint": fingerprint,
    }
    plans.append(record)
    return record


def _sqlglot_analysis(corpus: dict[str, Any]) -> list[dict[str, Any]]:
    results = []
    for case in corpus["cases"]:
        start = time.perf_counter()
        try:
            tree = sqlglot.parse_one(case["sql"], read="postgres")
            nodes = sorted({type(node).__name__ for node in tree.walk()})
            results.append(
                {
                    "caseId": case["id"],
                    "status": "parsed",
                    "root": type(tree).__name__,
                    "nodes": nodes,
                    "canonicalSql": tree.sql(dialect="postgres"),
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
        except BaseException as error:
            results.append(
                {
                    "caseId": case["id"],
                    "status": "parse-error",
                    "error": _error(error),
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
    return results


def _upstream_producer(
    corpus: dict[str, Any], output: Path, plans: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    resolver = _schema_resolver(corpus["tables"])
    results = []
    for case in corpus["cases"]:
        start = time.perf_counter()
        try:
            first = upstream_sql_to_substrait(
                case["sql"],
                "generic",
                resolver,
                ExtensionRegistry(load_default_extensions=True),
            )
            second = upstream_sql_to_substrait(
                case["sql"],
                "generic",
                resolver,
                ExtensionRegistry(load_default_extensions=True),
            )
            first_bytes = first.SerializeToString(deterministic=True)
            second_bytes = second.SerializeToString(deterministic=True)
            plan_record = _save_plan(output, "upstream-sqloxide", case["id"], first, plans)
            results.append(
                {
                    "caseId": case["id"],
                    "status": "produced",
                    "deterministicAcrossFreshRuns": first_bytes == second_bytes,
                    "firstSha256": hashlib.sha256(first_bytes).hexdigest(),
                    "secondSha256": hashlib.sha256(second_bytes).hexdigest(),
                    "fingerprint": plan_record["fingerprint"],
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
        except BaseException as error:
            results.append(
                {
                    "caseId": case["id"],
                    "status": "not-produced",
                    "error": _error(error),
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
    return results


def _bounded_producer(
    corpus: dict[str, Any], output: Path, plans: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    producer = BoundedSqlGlotProducer(corpus["tables"])
    results = []
    for case in corpus["cases"]:
        start = time.perf_counter()
        try:
            produced = producer.produce(case["sql"])
            plan_record = _save_plan(output, "sqlglot-bounded", case["id"], produced.plan, plans)
            results.append(
                {
                    "caseId": case["id"],
                    "status": "produced",
                    "supportedFeatures": list(produced.supported_features),
                    "fingerprint": plan_record["fingerprint"],
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
        except NotRepresentable as error:
            results.append(
                {
                    "caseId": case["id"],
                    "status": "not-representable",
                    "error": _error(error),
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
        except BaseException as error:
            results.append(
                {
                    "caseId": case["id"],
                    "status": "producer-error",
                    "error": _error(error),
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
    return results


def _visual_producer(
    corpus: dict[str, Any], output: Path, plans: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    start = time.perf_counter()
    try:
        produced = build_visual_plans(corpus["tables"])
    except BaseException as error:
        return [{"status": "producer-error", "error": _error(error)}]

    results = []
    for name, item in produced.items():
        plan_record = _save_plan(output, f"visual-{name}", item["caseId"], item["plan"], plans)
        results.append(
            {
                "name": name,
                "caseId": item["caseId"],
                "status": "produced",
                "fingerprint": plan_record["fingerprint"],
            }
        )
    results.append(
        {
            "status": "summary",
            "count": len(produced),
            "milliseconds": round((time.perf_counter() - start) * 1000, 3),
        }
    )
    return results


def _validator_results(plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    executable = shutil.which("substrait-validator")
    if executable is None:
        return [{"status": "not-installed"}]
    results = []
    for plan in plans:
        try:
            process = subprocess.run(
                [executable, plan["binaryPath"], "--mode", "loose"],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            results.append(
                {
                    "producer": plan["producer"],
                    "caseId": plan["caseId"],
                    "returnCode": process.returncode,
                    "status": "accepted" if process.returncode == 0 else "rejected-or-incompatible",
                    "stdout": process.stdout[-4000:],
                    "stderr": process.stderr[-4000:],
                }
            )
        except BaseException as error:
            results.append(
                {
                    "producer": plan["producer"],
                    "caseId": plan["caseId"],
                    "status": "validator-error",
                    "error": _error(error),
                }
            )
    return results


def _consumer_results(
    plans: list[dict[str, Any]], corpus_path: Path
) -> list[dict[str, Any]]:
    consumer_script = Path(__file__).with_name("consume_duckdb.py")
    results = []
    for plan in plans:
        if plan["caseId"] not in CONSUMER_CASES:
            continue
        start = time.perf_counter()
        try:
            process = subprocess.run(
                [
                    sys.executable,
                    str(consumer_script),
                    "--plan",
                    plan["binaryPath"],
                    "--corpus",
                    str(corpus_path),
                    "--case",
                    plan["caseId"],
                ],
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            payload = None
            if process.stdout.strip():
                try:
                    payload = json.loads(process.stdout.strip().splitlines()[-1])
                except json.JSONDecodeError:
                    payload = None
            results.append(
                {
                    "producer": plan["producer"],
                    "caseId": plan["caseId"],
                    "returnCode": process.returncode,
                    "status": (
                        "equivalent"
                        if payload and payload.get("equivalent") is True
                        else "consumed"
                        if payload and payload.get("equivalent") is None
                        else "different"
                        if payload and payload.get("equivalent") is False
                        else "native-or-process-failure"
                    ),
                    "payload": payload,
                    "stdout": process.stdout[-2000:],
                    "stderr": process.stderr[-4000:],
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
        except subprocess.TimeoutExpired as error:
            results.append(
                {
                    "producer": plan["producer"],
                    "caseId": plan["caseId"],
                    "status": "timeout",
                    "error": _error(error),
                    "milliseconds": round((time.perf_counter() - start) * 1000, 3),
                }
            )
    return results


def _source_loc(path: Path) -> int:
    return sum(
        1
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )


def _summary(
    environment: dict[str, Any],
    sqlglot_results: list[dict[str, Any]],
    upstream: list[dict[str, Any]],
    bounded: list[dict[str, Any]],
    visual: list[dict[str, Any]],
    validators: list[dict[str, Any]],
    consumers: list[dict[str, Any]],
    identity: dict[str, Any],
) -> str:
    def count(items, status):
        return sum(item.get("status") == status for item in items)

    lines = [
        "# Substrait semantic IR spike execution summary",
        "",
        f"- Python: `{environment['python']}`",
        f"- SQLGlot parsed: **{count(sqlglot_results, 'parsed')} / {len(sqlglot_results)}**",
        f"- Upstream sqloxide producer plans: **{count(upstream, 'produced')} / {len(upstream)}**",
        f"- Bounded SQLGlot producer plans: **{count(bounded, 'produced')} / {len(bounded)}**",
        f"- Visual/DataFrame plans: **{count(visual, 'produced')}**",
        f"- Nondeterministic upstream plans: **{sum(item.get('status') == 'produced' and not item.get('deterministicAcrossFreshRuns', True) for item in upstream)}**",
        f"- Validator accepted: **{count(validators, 'accepted')} / {len(validators)}**",
        f"- DuckDB equivalent: **{count(consumers, 'equivalent')} / {len(consumers)}**",
        f"- Identity sidecar checks: **{'PASS' if identity['allChecksPass'] else 'FAIL'}**",
        "",
        "Unsupported and incompatible results are evidence and remain in the JSON reports; this summary does not reinterpret them as test failures.",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--corpus", default=str(Path(__file__).parent / "fixtures" / "corpus.json"))
    args = parser.parse_args()

    output = Path(args.output).resolve()
    corpus_path = Path(args.corpus).resolve()
    output.mkdir(parents=True, exist_ok=True)
    corpus = json.loads(corpus_path.read_text(encoding="utf-8"))

    try:
        from substrait.version import substrait_version

        specification_version = str(substrait_version)
    except BaseException as error:
        specification_version = f"unavailable: {type(error).__name__}: {error}"

    distributions = [
        "sqlglot",
        "substrait",
        "substrait-protobuf",
        "substrait-extensions",
        "substrait-validator",
        "duckdb",
        "protobuf",
    ]
    environment = {
        "python": sys.version,
        "platform": platform.platform(),
        "substraitSpecificationVersion": specification_version,
        "packages": {name: _package_version(name) for name in distributions},
        "packageBytes": {name: _distribution_size(name) for name in distributions},
        "coldImports": [_measure_import("sqlglot"), _measure_import("substrait")],
        "baselineSha": "ffee4ee479b683e3346d5a96749229f798d4ca41",
    }
    _write_json(output / "environment.json", environment)

    plans: list[dict[str, Any]] = []
    sqlglot_results = _sqlglot_analysis(corpus)
    upstream_results = _upstream_producer(corpus, output, plans)
    bounded_results = _bounded_producer(corpus, output, plans)
    visual_results = _visual_producer(corpus, output, plans)

    _write_json(output / "sqlglot-analysis.json", sqlglot_results)
    _write_json(output / "upstream-sqloxide-producer.json", upstream_results)
    _write_json(output / "bounded-sqlglot-producer.json", bounded_results)
    _write_json(output / "visual-producer.json", visual_results)
    _write_json(output / "plans.json", plans)

    representative = next(
        (
            plan
            for plan in plans
            if plan["caseId"] == "filter_project" and plan["producer"].startswith("visual-")
        ),
        plans[0] if plans else None,
    )
    if representative is None:
        raise SpikeError("no Substrait plan was produced by any path")

    identity = run_identity_experiment(Path(representative["binaryPath"]).read_bytes())
    _write_json(output / "identity-sidecar.json", identity)
    if not identity["allChecksPass"]:
        raise SpikeError("identity sidecar invariants failed")

    validator_results = _validator_results(plans)
    consumer_results = _consumer_results(plans, corpus_path)
    _write_json(output / "validator.json", validator_results)
    _write_json(output / "duckdb-consumer.json", consumer_results)

    source_dir = Path(__file__).parent
    alternatives = {
        "measuredSpikeOwnedLoc": {
            "sqlglotToSubstraitAdapter": _source_loc(source_dir / "sqlglot_producer.py"),
            "identitySidecar": _source_loc(source_dir / "identity_sidecar.py"),
            "visualProducer": _source_loc(source_dir / "visual_producer.py"),
        },
        "interpretation": {
            "privateDvtIr": "would add relations, expressions, types, functions, validation and mappings beyond the measured adapter",
            "canonicalSubstrait": "removes private relational algebra but still needs frontend adapters and version/profile governance",
            "canonicalWithSidecar": "adds only stable identity/provenance mappings measured by identitySidecar LOC and bytes",
            "compiledIr": "keeps an editable authoring representation and therefore needs a strict proof that it is not a semantic copy",
        },
        "peakResidentSetKb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
    }
    _write_json(output / "alternative-metrics.json", alternatives)

    maturity_source = Path(__file__).parent / "fixtures" / "maturity.json"
    shutil.copy2(maturity_source, output / "maturity.json")

    summary = _summary(
        environment,
        sqlglot_results,
        upstream_results,
        bounded_results,
        visual_results,
        validator_results,
        consumer_results,
        identity,
    )
    (output / "summary.md").write_text(summary, encoding="utf-8")
    print(summary)

    if not any(item.get("status") == "produced" for item in upstream_results):
        raise SpikeError("upstream SQL producer generated no plans")
    if not any(item.get("status") == "produced" for item in bounded_results):
        raise SpikeError("bounded SQLGlot producer generated no plans")
    if not any(item.get("status") == "produced" for item in visual_results):
        raise SpikeError("visual producer generated no plans")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
