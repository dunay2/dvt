"""Real, optional OSS probes. No installer, provider calls or substitute algorithms."""
from pathlib import Path
import argparse
import hashlib
import importlib.metadata as metadata
import json
import math
import os
import platform
import random
import subprocess
import sys
import time

PINS = {"dask": ("dask", "2026.7.1"), "highs": ("scipy", "1.17.0")}

def digest(corpus):
    return hashlib.sha256(json.dumps(corpus, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()

def never_execute(*args):
    raise RuntimeError("Ranking must never execute workloads")

def dask_once(corpus, seed):
    from dask.order import order
    results = []
    for fixture in corpus["fixtures"] + corpus["generated"]:
        tasks = list(fixture["tasks"])
        random.Random(seed).shuffle(tasks)
        dependencies = {}
        for task in tasks:
            deps = list(task["deps"])
            random.Random(seed).shuffle(deps)
            dependencies[task["id"]] = (never_execute, *deps)
        started = time.perf_counter()
        ranks = order(dependencies)
        elapsed = (time.perf_counter() - started) * 1000
        ranking = sorted(ranks, key=lambda key: (ranks[key], key))
        if set(ranking) != {t["id"] for t in tasks}:
            raise ValueError("Upstream ranking has incorrect coverage")
        positions = {key: i for i, key in enumerate(ranking)}
        for task in tasks:
            for dep in task["deps"]:
                if positions[dep] >= positions[task["id"]]:
                    raise ValueError("Upstream order is not topological")
        results.append({"fixture": fixture["name"], "order": ranking, "rankMs": elapsed})
    return results

def dask_probe(corpus_path):
    runs = []
    for hashseed in (0, 1, 17, 42):
        for insertion in (0, 1, 2, 3):
            proc = subprocess.run(
                [sys.executable, __file__, "--backend", "dask", "--corpus", str(corpus_path), "--child", str(insertion)],
                env={**os.environ, "PYTHONHASHSEED": str(hashseed)},
                capture_output=True, text=True, timeout=60, check=True,
            )
            runs.append({"hashseed": hashseed, "permutation": insertion, "results": json.loads(proc.stdout)})
    variants = {}
    for run in runs:
        for item in run["results"]:
            variants.setdefault(item["fixture"], set()).add(tuple(item["order"]))
    distinct = {name: len(value) for name, value in variants.items()}
    return {"results": runs[0]["results"], "runs": runs, "distinctOrders": distinct,
            "identityDeterministicInProbe": all(value == 1 for value in distinct.values()),
            "scope": "Actual dask.order only; no distributed scheduler or SQL"}

def validate_schedule(fixture, trace):
    tasks = fixture["tasks"]
    by = {row["id"]: row for row in trace}
    if len(by) != len(tasks) or set(by) != {t["id"] for t in tasks}:
        raise ValueError("Incorrect solver coverage")
    for task in tasks:
        row = by[task["id"]]
        if row["start"] < 0 or row["end"] - row["start"] != task["duration"]:
            raise ValueError("Incorrect solver interval")
        if any(by[dep]["end"] > row["start"] for dep in task["deps"]):
            raise ValueError("Solver precedence violation")
    instants = {row[key] for row in trace for key in ("start", "end")}
    for at in instants:
        for resource, capacity in fixture["capacity"].items():
            usage = sum(t["demand"].get(resource, 0) for t in tasks if by[t["id"]]["start"] <= at < by[t["id"]]["end"])
            if usage > capacity:
                raise ValueError("Solver capacity violation")

def highs_solve(fixture):
    import numpy as np
    from scipy.optimize import Bounds, LinearConstraint, milp
    from scipy.sparse import coo_matrix
    begin = time.perf_counter()
    tasks = sorted(fixture["tasks"], key=lambda t: t["id"])
    for task in tasks:
        if type(task["duration"]) is not int or task["duration"] <= 0:
            raise ValueError("Positive integer durations required")
    horizon = sum(t["duration"] for t in tasks)
    if horizon > 1000 or len(tasks) > 100:
        raise ValueError("Outside bounded time-indexed laboratory model")
    positions = {t["id"]: i for i, t in enumerate(tasks)}
    starts, counter = {}, 0
    for i, task in enumerate(tasks):
        starts[i] = []
        for s in range(horizon - task["duration"] + 1):
            starts[i].append((s, counter))
            counter += 1
    cmax, nv = counter, counter + 1
    rr, cc, vv, lo, hi = [], [], [], [], []
    def add(terms, lower=-np.inf, upper=np.inf):
        row = len(lo)
        for column, value in terms:
            if value:
                rr.append(row); cc.append(column); vv.append(value)
        lo.append(lower); hi.append(upper)
    for i, task in enumerate(tasks):
        add([(col, 1) for _, col in starts[i]], 1, 1)
        add([(cmax, 1)] + [(col, -s) for s, col in starts[i]], task["duration"])
        for dep in task["deps"]:
            j = positions[dep]
            add([(col, s) for s, col in starts[i]] + [(col, -s) for s, col in starts[j]], tasks[j]["duration"])
    for resource, capacity in fixture["capacity"].items():
        for instant in range(horizon):
            terms = []
            for i, task in enumerate(tasks):
                demand = task["demand"].get(resource, 0)
                if demand:
                    terms.extend((col, demand) for s, col in starts[i] if s <= instant < s + task["duration"])
            if terms:
                add(terms, upper=capacity)
    matrix = coo_matrix((vv, (rr, cc)), shape=(len(lo), nv)).tocsc()
    upper = np.ones(nv); upper[cmax] = horizon
    objective = np.zeros(nv); objective[cmax] = 1
    integrality = np.ones(nv); integrality[cmax] = 0
    build_ms = (time.perf_counter() - begin) * 1000
    before = time.perf_counter()
    solved = milp(objective, integrality=integrality, bounds=Bounds(np.zeros(nv), upper),
                  constraints=LinearConstraint(matrix, lo, hi), options={"time_limit": 1.0, "mip_rel_gap": 0.0})
    def finite(value):
        return float(value) if value is not None and math.isfinite(value) else None
    result = {"fixture": fixture["name"], "status": int(solved.status), "message": solved.message,
              "modelVariables": nv, "modelRows": len(lo), "horizon": horizon, "buildMs": build_ms,
              "solveMs": (time.perf_counter() - before) * 1000, "objective": finite(solved.fun),
              "dualBound": finite(getattr(solved, "mip_dual_bound", None)),
              "gap": finite(getattr(solved, "mip_gap", None)), "validated": False}
    if solved.x is not None:
        trace = []
        for i, task in enumerate(tasks):
            choices = [s for s, col in starts[i] if solved.x[col] > 0.5]
            if len(choices) != 1:
                raise ValueError("No unique integer start")
            s = choices[0]
            trace.append({"id": task["id"], "start": s, "end": s + task["duration"]})
        validate_schedule(fixture, trace)
        if abs(max(row["end"] for row in trace) - solved.fun) >= 1e-5:
            raise ValueError("Objective/trace mismatch")
        result.update(validated=True, trace=sorted(trace, key=lambda row: (row["start"], row["id"])))
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend", required=True, choices=PINS)
    parser.add_argument("--corpus", required=True, type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--child", type=int, help=argparse.SUPPRESS)
    args = parser.parse_args()
    corpus = json.loads(args.corpus.read_text(encoding="utf-8"))
    report = {"schemaVersion": "pln2-lab-probe.v1", "backend": args.backend,
              "corpusSha256": digest(corpus), "python": platform.python_version(), "results": []}
    if args.out and args.out.exists():
        parser.error("Output already exists; choose a new evidence file")
    if args.child is None and not args.out:
        parser.error("--out is required")
    code, started = 0, time.perf_counter()
    try:
        package, pin = PINS[args.backend]
        version = metadata.version(package)
        report["version"] = version
        if version != pin:
            raise ModuleNotFoundError(f"Requires {package}=={pin}; found {version}")
        if args.child is not None:
            print(json.dumps(dask_once(corpus, args.child)))
            return 0
        if args.backend == "dask":
            report.update(dask_probe(args.corpus.resolve()))
        else:
            try:
                from scipy.optimize._highspy import _core
                report["solverVersion"] = ".".join(str(getattr(_core, "HIGHS_VERSION_" + key)) for key in ("MAJOR", "MINOR", "PATCH"))
            except (ImportError, AttributeError):
                report["solverVersion"] = "UNKNOWN; bundled version not introspectable"
            report["scope"] = "Actual native HiGHS through SciPy; NOT highs-js/WASM/OR-Tools"
            report["objective"] = "makespan with known synthetic durations; business priority NOT modeled"
            report["results"] = [highs_solve(fixture) for fixture in corpus["fixtures"]]
        report["status"] = "EXECUTED"
    except (metadata.PackageNotFoundError, ModuleNotFoundError) as error:
        report.update(status="UNAVAILABLE", reason=str(error)); code = 2
    except Exception as error:
        report.update(status="ERROR", reason=f"{type(error).__name__}: {error}"); code = 1
    report["probeWallMs"] = (time.perf_counter() - started) * 1000
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("x", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, allow_nan=False)
            handle.write("\n")
    print(json.dumps({key: report.get(key) for key in ("backend", "status", "version", "reason")}))
    return code

if __name__ == "__main__":
    sys.exit(main())
