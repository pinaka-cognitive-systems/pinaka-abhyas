"""Executable solution for arn_caf_qa_000956.

CI-minus-SI back-calculation of the principal.
SI(2yr) = 2*P*r = 1000  -> P*r = 500
CI(2yr) - SI(2yr) = P*r^2 = 1050 - 1000 = 50
r = (P*r^2)/(P*r) = 50/500 = 0.10
P = 500/0.10 = 5000
"""


def solve():
    si_2yr = 1000.0
    ci_2yr = 1050.0

    pr = si_2yr / 2          # P*r = 500
    pr2 = ci_2yr - si_2yr    # P*r^2 = 50
    r = pr2 / pr             # 0.10
    p = pr / r               # 5000

    option_key = 1
    return {"value": p, "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
