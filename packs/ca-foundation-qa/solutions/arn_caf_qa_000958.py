"""Executable solution for arn_caf_qa_000958.

Back-calculate the rate from two CI-minus-SI gaps.
2-year gap: P*r^2 = 100
3-year gap: P*r^2*(3 + r) = 310
Ratio cancels P*r^2: 3 + r = 310/100 = 3.10 -> r = 0.10 = 10%.
"""


def solve():
    gap_2yr = 100.0
    gap_3yr = 310.0

    ratio = gap_3yr / gap_2yr   # 3.10 = 3 + r
    r = ratio - 3               # 0.10
    rate_pct = r * 100          # 10

    option_key = 1
    return {"value": rate_pct, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
