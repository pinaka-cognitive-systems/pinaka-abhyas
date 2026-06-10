"""Executable solution for arn_caf_qa_000023.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=Rs 6,340  2=Rs 8,620  3=Rs 9,282  4=Rs 9,200

Ordinary annuity (end-of-period payments).
FV = PMT * [(1 + r)^n - 1] / r.
PMT = 2000, r = 0.10, n = 4. Given: (1.1)^4 = 1.4641.
"""


def solve():
    pmt = 2_000
    r = 0.10
    n = 4
    growth_factor = 1.4641  # (1.1)^4 given in the stem

    annuity_factor = (growth_factor - 1) / r  # (0.4641) / 0.10 = 4.641
    fv = pmt * annuity_factor  # 2000 * 4.641 = 9282

    # option 3 = Rs 9,282
    option_key = 3
    return {"value": fv, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
