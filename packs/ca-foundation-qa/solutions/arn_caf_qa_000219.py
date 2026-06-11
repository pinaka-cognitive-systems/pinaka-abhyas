"""Executable solution for arn_caf_qa_000219.

Contract: solve() returns {"value": ..., "option_key": <int>}.

Frequency distribution: find missing frequency f given mean = 18.

  Class intervals: 0-10, 10-20, 20-30, 30-40.
  Frequencies:      6,    f,    10,     4.
  Total: 20+f. Mean = 18.

  Midpoints: 5, 15, 25, 35.
  Sum(f*x) = 5*6 + 15*f + 25*10 + 35*4 = 30 + 15f + 250 + 140 = 420 + 15f.

  Mean = (420+15f)/(20+f) = 18
  => 420+15f = 360+18f
  => 3f = 60
  => f = 20.

Options: 1=20  2=68  3=10  4=15
Correct: 1
"""

from fractions import Fraction


CLASSES = [
    {"lower": 0,  "upper": 10, "freq": 6},
    {"lower": 10, "upper": 20, "freq": None},   # missing frequency f
    {"lower": 20, "upper": 30, "freq": 10},
    {"lower": 30, "upper": 40, "freq": 4},
]

TARGET_MEAN = 18
KEYED_ANSWER = 20
OPTION_KEY = 1


def _midpoint(cls):
    return (cls["lower"] + cls["upper"]) / 2


def solve():
    # Use symbolic arithmetic with Fraction to avoid float issues.
    # Sum(f*x) = known_sum + midpoint_unknown * f_unknown.
    known_freq_sum = sum(c["freq"] for c in CLASSES if c["freq"] is not None)
    known_fx_sum = sum(_midpoint(c) * c["freq"] for c in CLASSES if c["freq"] is not None)
    unknown_midpoint = _midpoint(next(c for c in CLASSES if c["freq"] is None))

    # Total frequency = known_freq_sum + f
    # Sum(f*x) = known_fx_sum + unknown_midpoint * f
    # mean = (known_fx_sum + unknown_midpoint*f) / (known_freq_sum + f) = TARGET_MEAN
    # => known_fx_sum + unknown_midpoint*f = TARGET_MEAN*(known_freq_sum + f)
    # => f*(unknown_midpoint - TARGET_MEAN) = TARGET_MEAN*known_freq_sum - known_fx_sum
    # => f = (TARGET_MEAN*known_freq_sum - known_fx_sum) / (unknown_midpoint - TARGET_MEAN)

    numerator   = Fraction(TARGET_MEAN * known_freq_sum - known_fx_sum)
    denominator = Fraction(unknown_midpoint - TARGET_MEAN)
    f = numerator / denominator

    # Verify it is a positive integer.
    assert f.denominator == 1, f"f must be an integer, got {f}"
    f_int = int(f)
    assert f_int > 0, f"f must be positive, got {f_int}"
    assert f_int == KEYED_ANSWER, f"Expected f={KEYED_ANSWER}, got {f_int}"

    # Verify by back-substitution.
    total_freq = known_freq_sum + f_int
    total_fx   = known_fx_sum + unknown_midpoint * f_int
    mean_check = total_fx / total_freq
    assert abs(mean_check - TARGET_MEAN) < 1e-9, f"Back-check failed: mean={mean_check}"

    return {"value": f_int, "option_key": OPTION_KEY}


if __name__ == "__main__":
    print(solve())
