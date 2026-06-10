"""Deterministic case generator for the W1-12 cross-check.

Emits crosscheck/cases.json: 500 update sequences spanning the full input domain
of SPEC section 3, each with the inputs and the Python reference's computed final
(rating, deviation) to 12 decimal places.

The PRNG is mulberry32, implemented here in pure Python so a JavaScript twin seeded
identically reproduces the same stream. Determinism is the whole point: re-running
this script yields byte-identical cases.json.

Domain coverage (per the W1-12 brief):
  - ability levels in [-3, 3] (seeded as the starting rating)
  - all three difficulty labels (L1, L2, L3)
  - both item types (single_best, numeric_entry)
  - empirical difficulty overrides (sometimes present, sometimes absent)
  - idle gaps from minutes to 200 days
  - event counts from 1 to 300
"""

import json
import os

import glicko_lite as g

# 32-bit mask for the mulberry32 integer arithmetic.
U32 = 0xFFFFFFFF


class Mulberry32:
    """mulberry32 PRNG. A small, fast, seedable 32-bit generator.

    Reference algorithm (the canonical mulberry32):
        t = (state + 0x6D2B79F5) >>> 0
        x = t
        x = Math.imul(x ^ (x >>> 15), x | 1) >>> 0
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61) >>> 0   // (with >>>0 inside)
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296

    Implemented with explicit 32-bit masking so Python's big ints behave like
    the JS uint32 / Math.imul semantics exactly.
    """

    def __init__(self, seed):
        self.state = seed & U32

    @staticmethod
    def _imul(a, b):
        # 32-bit signed multiply low word, like JS Math.imul, returned as uint32.
        return (a * b) & U32

    def next_u32(self):
        self.state = (self.state + 0x6D2B79F5) & U32
        t = self.state
        x = self._imul(t ^ (t >> 15), t | 1)
        x = (x ^ (x + self._imul(x ^ (x >> 7), x | 61))) & U32
        x = (x ^ (x >> 14)) & U32
        return x

    def next_float(self):
        """Float in [0, 1)."""
        return self.next_u32() / 4294967296.0

    def next_int(self, lo, hi_inclusive):
        """Integer in [lo, hi_inclusive]."""
        span = hi_inclusive - lo + 1
        return lo + int(self.next_float() * span)

    def pick(self, options):
        return options[self.next_int(0, len(options) - 1)]


DIFFICULTY_LABELS = ["L1", "L2", "L3"]
ITEM_TYPES = ["single_best", "numeric_entry"]

MINUTE_MS = 60_000
DAY_MS = 86_400_000

NUM_CASES = 500


def _gap_ms(rng):
    """An idle gap from a few minutes up to ~200 days, log-ish spread."""
    bucket = rng.next_int(0, 4)
    if bucket == 0:
        # minutes
        return rng.next_int(1, 59) * MINUTE_MS
    if bucket == 1:
        # hours
        return rng.next_int(1, 23) * 60 * MINUTE_MS
    if bucket == 2:
        # a few days
        return rng.next_int(1, 7) * DAY_MS
    if bucket == 3:
        # weeks to a couple months
        return rng.next_int(8, 60) * DAY_MS
    # up to 200 days
    return rng.next_int(61, 200) * DAY_MS


def _starting_rating(rng):
    """Seed an ability in [-3, 3]."""
    return round(-3.0 + rng.next_float() * 6.0, 9)


def build_case(case_id, rng):
    n_events = rng.next_int(1, 300)
    start_rating = _starting_rating(rng)

    # Initial skill: a student with this ability, fresh deviation, clock at 0.
    initial = {
        "rating": start_rating,
        "deviation": g.PRIOR_DEVIATION,
        "lastEventMs": 0,
        "attempts": 0,
    }

    observations = []
    now_ms = 0
    skill = dict(initial)
    for _ in range(n_events):
        now_ms += _gap_ms(rng)
        label = rng.pick(DIFFICULTY_LABELS)
        item_type = rng.pick(ITEM_TYPES)

        # Empirical override present ~35% of the time, in a plausible band.
        if rng.next_float() < 0.35:
            empirical = round(-2.0 + rng.next_float() * 4.0, 9)
        else:
            empirical = None

        # Correctness is drawn from the model's own expectation on the drifted skill
        # so sequences are realistic (a converging / lapsing trajectory), but the
        # outcome itself is a coin flip against E so we exercise both y=0 and y=1.
        drifted = g.apply_idle_drift(skill, now_ms)
        e = g.expected_outcome(drifted, label, item_type, empirical)
        correct = rng.next_float() < e

        obs = {
            "correct": correct,
            "difficulty_label": label,
            "item_type": item_type,
            "occurred_at_ms": now_ms,
            "empirical_difficulty": empirical,
        }
        observations.append(obs)
        skill = g.update_skill(skill, obs)

    final = skill
    return {
        "id": case_id,
        "initial": {
            "rating": initial["rating"],
            "deviation": initial["deviation"],
            "lastEventMs": initial["lastEventMs"],
            "attempts": initial["attempts"],
        },
        "observations": observations,
        "expected": {
            "rating": round(final["rating"], 12),
            "deviation": round(final["deviation"], 12),
        },
    }


def main():
    # Single master seed; each case gets a derived stream so cases are independent
    # yet the whole set is reproducible from one number.
    master = Mulberry32(1234567)
    cases = []
    for i in range(NUM_CASES):
        # Derive a per-case seed deterministically from the master stream.
        seed = master.next_u32()
        rng = Mulberry32(seed)
        case = build_case(f"case-{i:04d}", rng)
        case["seed"] = seed
        cases.append(case)

    out = {
        "spec": "engine-ts/SPEC.md section 3",
        "prng": "mulberry32",
        "master_seed": 1234567,
        "tolerance": 1e-6,
        "decimal_places": 12,
        "count": len(cases),
        "cases": cases,
    }

    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "cases.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {len(cases)} cases to {path}")


if __name__ == "__main__":
    main()
