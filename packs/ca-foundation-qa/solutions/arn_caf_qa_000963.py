"""Executable solution for arn_caf_qa_000963.

NPV of two mutually exclusive projects with uneven cash flows; accept/reject.
Both cost 20000, both total 24000. Discount factors 0.9091, 0.8264, 0.7513.
NPV(A) = +210 (front-loaded), NPV(B) = -421 (back-loaded).
Decision: accept A only -> option 1.
"""


def solve():
    outlay = 20000.0
    df = [0.9091, 0.8264, 0.7513]
    cf_a = [10000, 8000, 6000]
    cf_b = [6000, 8000, 10000]

    npv_a = sum(c * d for c, d in zip(cf_a, df)) - outlay
    npv_b = sum(c * d for c, d in zip(cf_b, df)) - outlay

    if npv_a > 0 and npv_b <= 0:
        option_key = 1
    elif npv_a <= 0 and npv_b <= 0:
        option_key = 4
    elif npv_b > npv_a:
        option_key = 3
    else:
        option_key = 1

    return {"value": round(npv_a), "option_key": option_key}


if __name__ == "__main__":
    import json
    print(json.dumps(solve()))
