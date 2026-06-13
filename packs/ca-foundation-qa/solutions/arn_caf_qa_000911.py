"""Executable solution for arn_caf_qa_000911.

NPV: outlay 12000 now; inflows 5000, 6000, 4000 at years 1-3.
PV factors at 10%: 0.909, 0.826, 0.751.
Options: 1=505  2=3000  3=12505  4=1597
"""


def solve():
    outlay = 12000
    inflows = [5000, 6000, 4000]
    df = [0.909, 0.826, 0.751]
    pv_inflows = sum(c * d for c, d in zip(inflows, df))
    npv = pv_inflows - outlay
    return {"value": round(npv), "option_key": 1}


if __name__ == "__main__":
    print(solve())
