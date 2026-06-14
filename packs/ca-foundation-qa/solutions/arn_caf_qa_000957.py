"""Executable solution for arn_caf_qa_000957.

Two-phase rate change with a mid-stream deposit; back-calculate the principal.
End yr2 = (yr1_close + 2000) * 1.20 = 15600
 -> yr1_close + 2000 = 15600/1.20 = 13000
 -> yr1_close = 11000
 -> P * 1.10 = 11000 -> P = 10000
"""


def solve():
    end_yr2 = 15600.0
    addition = 2000.0
    r1 = 0.10
    r2 = 0.20

    after_addition = end_yr2 / (1 + r2)   # 13000
    yr1_close = after_addition - addition  # 11000
    p = yr1_close / (1 + r1)               # 10000

    option_key = 1
    return {"value": p, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
