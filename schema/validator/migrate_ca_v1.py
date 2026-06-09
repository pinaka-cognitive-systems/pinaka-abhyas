#!/usr/bin/env python3
"""Executable CA Foundation v1 -> UQS migration (spec section 16.1).

Demonstrates the migration map as code, not a table of promises. A real run
needs a complete (topic, subtopic) -> taxonomy-node map; here a small one
covers the fixture.
"""

POOL_CODE = {"seed": "sd", "vault": "vlt", "arena": "arn"}
SUBJECT_CODE = {"quantitative_aptitude": "qa", "business_economics": "be"}

TOPIC_NODE = {
    ("probability", "conditional_probability"): "qa.stats.probability.conditional",
    ("probability", "independent_events"): "qa.stats.probability.independent_events",
}


def _widen(seq_id: str) -> str:
    return seq_id.split("_")[-1].zfill(6)


def migrate(v1: dict) -> dict:
    subj = SUBJECT_CODE[v1["subject"]]
    new_id = f"{POOL_CODE[v1['pool']]}_caf_{subj}_{_widen(v1['id'])}"

    node = TOPIC_NODE.get((v1["topic"], v1["subtopic"]))
    tests = [node] if node else []

    provenance = {
        "source": v1.get("icai_provenance", "migrated_ca_v1"),
        "license": "LicenseRef-pinaka-internal-unreleased",
        "created": v1["created"],
    }
    if v1.get("parent_seed_id"):
        provenance["parent_id"] = f"sd_caf_{subj}_{_widen(v1['parent_seed_id'])}"

    uqs = {
        "id": new_id,
        "schema_version": "uqs-1",
        "exam": "ca_foundation",
        "lang": "en",
        "pool": v1["pool"],
        "verification_status": "machine_verified",
        "provenance": provenance,
        "tests": tests,
        "difficulty_label": v1["difficulty"],
        "taxonomy_version": 1,
        "item_type": "single_best",
        "stem": v1["body"],
        "options": [{"key": i + 1, "text": t} for i, t in enumerate(v1["options"])],
        "answer_key": {"correct": v1["correct_option"]},
        "explanation": v1["explanation"],
        "empirical": {"calibration_status": "none", "n_responses": 0},
        "ext": {
            "icai_skill_bucket": v1.get("skill"),
            "icai_provenance": v1.get("icai_provenance"),
            "tier_eligibility": v1.get("tier_eligibility", []),
        },
    }
    if v1.get("tags"):
        uqs["tags"] = v1["tags"]
    return uqs
