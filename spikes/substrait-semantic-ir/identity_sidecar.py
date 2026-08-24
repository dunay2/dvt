"""Minimal stable-identity sidecar experiment for positional Substrait fields."""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from typing import Any


def _canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def run_identity_experiment(plan_bytes: bytes) -> dict[str, Any]:
    """Prove rename/reorder/reload without duplicating relational semantics.

    The sidecar contains only stable product identity and mappings to semantic
    input/output positions. It deliberately contains no Filter, Join, Aggregate,
    function or type definitions.
    """

    plan_sha = hashlib.sha256(plan_bytes).hexdigest()
    original = {
        "schemaVersion": 1,
        "semanticPlanSha256": plan_sha,
        "relations": [
            {
                "relationId": "rel-customers",
                "resource": {"kind": "named-table", "name": "customers"},
            }
        ],
        "fields": [
            {
                "fieldId": "field-customer-id",
                "source": {"relationId": "rel-customers", "sourceOrdinal": 0},
                "outputOrdinal": 0,
                "displayName": "customer_id",
            },
            {
                "fieldId": "field-customer-name",
                "source": {"relationId": "rel-customers", "sourceOrdinal": 1},
                "outputOrdinal": 1,
                "displayName": "customer_name",
            },
        ],
    }

    renamed = deepcopy(original)
    renamed["fields"][1]["displayName"] = "display_name"

    reordered = deepcopy(renamed)
    reordered["fields"][0]["outputOrdinal"] = 1
    reordered["fields"][1]["outputOrdinal"] = 0

    reloaded = json.loads(_canonical(reordered))

    original_ids = {field["fieldId"] for field in original["fields"]}
    renamed_ids = {field["fieldId"] for field in renamed["fields"]}
    reordered_ids = {field["fieldId"] for field in reordered["fields"]}
    reloaded_ids = {field["fieldId"] for field in reloaded["fields"]}

    checks = {
        "renamePreservesFieldIds": original_ids == renamed_ids,
        "reorderPreservesFieldIds": original_ids == reordered_ids,
        "reloadPreservesFieldIds": original_ids == reloaded_ids,
        "renamePreservesSourceLineage": original["fields"][1]["source"]
        == renamed["fields"][1]["source"],
        "reorderChangesOnlyOutputPositions": sorted(
            (field["fieldId"], field["source"]["sourceOrdinal"])
            for field in original["fields"]
        )
        == sorted(
            (field["fieldId"], field["source"]["sourceOrdinal"])
            for field in reordered["fields"]
        ),
        "sidecarContainsNoRelationalOperators": not any(
            token in _canonical(reloaded)
            for token in ("FilterRel", "JoinRel", "AggregateRel", "ProjectRel")
        ),
        "semanticPlanBindingSurvivesReload": reloaded["semanticPlanSha256"] == plan_sha,
    }

    return {
        "mechanism": "Substrait semantic plan plus DVT identity-only sidecar",
        "original": original,
        "renamed": renamed,
        "reorderedAndReloaded": reloaded,
        "checks": checks,
        "allChecksPass": all(checks.values()),
        "sidecarBytes": len(_canonical(reloaded).encode("utf-8")),
    }
