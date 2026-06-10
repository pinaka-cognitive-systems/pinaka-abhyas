"""Independent reference implementation of SPEC section 3 (Glicko-lite mastery).

W1-12 cross-check. This module is written from engine-ts/SPEC.md section 3 and
ADR 0012 ALONE. It has never seen engine-ts/src/. Its only purpose is to be an
independent twin of the TypeScript engine so divergence is detectable.

Pure stdlib. Deterministic. No wall clock, no randomness, no IO.

Contract restated from SPEC section 3:
  - Scale anchors: L1 = -1, L2 = 0, L3 = +1.
  - Guessing floor c: 0.25 for single_best, 0 for numeric_entry.
  - Prior: rating r = 0, deviation rd = 1.5.
  - Bounds: rd in [0.25, 1.5]; |r| <= 4.
  - Expectation: E = c + (1-c) * sigmoid(r - b),
       b = empirical.difficulty_b if present else the label anchor.
  - Update (one-step Laplace): with p = sigmoid(r - b),
       dEdr = (1-c) * p * (1-p),
       var  = max(E * (1-E), 1e-9),
       info = dEdr^2 / var,
       prec' = 1/rd^2 + info,
       r'  = clamp(r + ((y - E) * dEdr / var) / prec',  -4, 4),
       rd' = clamp(sqrt(1/prec'),  0.25, 1.5).
  - Idle drift, applied BEFORE each update and on read:
       variance grows by ((1.5^2 - 0.25^2) / 90) per idle day, capped at the
       prior variance (1.5^2);
       rating fades toward 0 by exp(-idleDays / 120).
       The two clocks are deliberately separate (fade uses /120, variance uses /90).
  - An event updates every node in its tests list (handled by the caller).
"""

import math

# --- Constants restated from SPEC section 3 (scale.ts is forbidden to read). ---

ANCHOR = {"L1": -1.0, "L2": 0.0, "L3": 1.0}

PRIOR_RATING = 0.0
PRIOR_DEVIATION = 1.5

RD_MIN = 0.25
RD_MAX = 1.5

RATING_ABS_CAP = 4.0

GUESSING_FLOOR = {"single_best": 0.25, "numeric_entry": 0.0}

# Idle drift: two separate clocks.
# Variance grows per idle day; capped at the prior variance.
VARIANCE_PER_DAY = (RD_MAX ** 2 - RD_MIN ** 2) / 90.0  # (1.5^2 - 0.25^2)/90
PRIOR_VARIANCE = PRIOR_DEVIATION ** 2                   # 1.5^2 = 2.25, the cap.
# Rating fade time constant, applied only to idle time beyond the grace period
# (SPEC rev 2026-06-10: normal practice rhythms carry no fade).
FADE_TAU_DAYS = 120.0
FADE_GRACE_DAYS = 30.0
# Per-event process noise (SPEC rev 2026-06-10): the estimator is a tracker.
PROCESS_NOISE_PER_EVENT = 0.003

MS_PER_DAY = 86400000.0


def _clamp(x, lo, hi):
    if x < lo:
        return lo
    if x > hi:
        return hi
    return x


def sigmoid(x):
    # Numerically stable logistic.
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def fresh_skill():
    """The prior skill, mirroring the engine's FRESH_SKILL."""
    return {
        "rating": PRIOR_RATING,
        "deviation": PRIOR_DEVIATION,
        "lastEventMs": 0,
        "attempts": 0,
    }


def difficulty_b(difficulty_label, empirical_difficulty=None):
    """b = empirical.difficulty_b if present else the label anchor."""
    if empirical_difficulty is not None:
        return float(empirical_difficulty)
    return ANCHOR[difficulty_label]


def expected_outcome(skill, difficulty_label, item_type, empirical_difficulty=None):
    """E = c + (1-c) * sigmoid(r - b)."""
    c = GUESSING_FLOOR[item_type]
    b = difficulty_b(difficulty_label, empirical_difficulty)
    p = sigmoid(skill["rating"] - b)
    return c + (1.0 - c) * p


def apply_idle_drift(skill, now_ms):
    """Idle drift applied before each update and on read.

    variance += VARIANCE_PER_DAY * idleDays, capped at PRIOR_VARIANCE;
    rating  *= exp(-idleDays / FADE_TAU_DAYS).
    """
    # SPEC rev 2026-06-10: drift applies only to skills with >= 1 observed
    # event; a never-attempted skill is the prior and its lastEventMs sentinel
    # of 0 is not a timestamp.
    if skill["attempts"] == 0:
        return {
            "rating": skill["rating"],
            "deviation": skill["deviation"],
            "lastEventMs": skill["lastEventMs"],
            "attempts": skill["attempts"],
        }
    idle_ms = now_ms - skill["lastEventMs"]
    if idle_ms <= 0:
        # No elapsed time (or non-monotonic clock): nothing to drift.
        return {
            "rating": skill["rating"],
            "deviation": skill["deviation"],
            "lastEventMs": skill["lastEventMs"],
            "attempts": skill["attempts"],
        }
    idle_days = idle_ms / MS_PER_DAY

    variance = skill["deviation"] ** 2
    variance = variance + VARIANCE_PER_DAY * idle_days
    if variance > PRIOR_VARIANCE:
        variance = PRIOR_VARIANCE
    new_dev = math.sqrt(variance)
    # rd bound is structural; the cap is the prior variance so it stays within [.25, 1.5].
    new_dev = _clamp(new_dev, RD_MIN, RD_MAX)

    fade_days = idle_days - FADE_GRACE_DAYS
    if fade_days < 0.0:
        fade_days = 0.0
    new_rating = skill["rating"] * math.exp(-fade_days / FADE_TAU_DAYS)

    return {
        "rating": new_rating,
        "deviation": new_dev,
        "lastEventMs": skill["lastEventMs"],
        "attempts": skill["attempts"],
    }


def update_skill(skill, obs):
    """One-step Laplace update for a single observation.

    obs = {
      "correct": bool,
      "difficulty_label": "L1"|"L2"|"L3",
      "item_type": "single_best"|"numeric_entry",
      "occurred_at_ms": int,
      "empirical_difficulty": float | None,
    }

    Idle drift is applied first (before the update), using the gap between this
    event's occurred_at_ms and the skill's lastEventMs.
    """
    occurred_at_ms = obs["occurred_at_ms"]

    # Drift first (SPEC: "applied before each update").
    drifted = apply_idle_drift(skill, occurred_at_ms)

    r = drifted["rating"]
    rd = drifted["deviation"]

    c = GUESSING_FLOOR[obs["item_type"]]
    b = difficulty_b(obs["difficulty_label"], obs.get("empirical_difficulty"))

    p = sigmoid(r - b)
    E = c + (1.0 - c) * p
    dEdr = (1.0 - c) * p * (1.0 - p)
    var = E * (1.0 - E)
    if var < 1e-9:
        var = 1e-9
    info = (dEdr * dEdr) / var

    prior_variance = rd * rd + PROCESS_NOISE_PER_EVENT
    if prior_variance > PRIOR_VARIANCE:
        prior_variance = PRIOR_VARIANCE
    prec_new = 1.0 / prior_variance + info

    y = 1.0 if obs["correct"] else 0.0
    r_new = r + ((y - E) * dEdr / var) / prec_new
    r_new = _clamp(r_new, -RATING_ABS_CAP, RATING_ABS_CAP)

    rd_new = math.sqrt(1.0 / prec_new)
    rd_new = _clamp(rd_new, RD_MIN, RD_MAX)

    return {
        "rating": r_new,
        "deviation": rd_new,
        "lastEventMs": occurred_at_ms,
        "attempts": drifted["attempts"] + 1,
    }


def replay_sequence(observations, initial=None):
    """Fold update_skill over an ordered observation list, returning final skill.

    Caller is responsible for ordering. Observations are assumed already in
    (occurredAtMs ascending) order per SPEC 2.1.
    """
    skill = initial if initial is not None else fresh_skill()
    for obs in observations:
        skill = update_skill(skill, obs)
    return skill
