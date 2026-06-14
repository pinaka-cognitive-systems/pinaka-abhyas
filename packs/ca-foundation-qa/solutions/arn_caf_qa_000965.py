"""Executable solution for arn_caf_qa_000965.

Sinking fund where the net outlay must be derived first.
Net target = future cost 120000 - salvage 20000 = 100000.
deposit * FV_annuity_factor(4,10%=4.641) = 100000
deposit = 100000 / 4.641 = 21547.
"""


def solve():
    future_cost = 120000.0
    salvage = 20000.0
    fv_annuity_factor = 4.641

    net_target = future_cost - salvage   # 100000
    deposit = net_target / fv_annuity_factor  # ~21547

    option_key = 1
    return {"value": round(deposit), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
