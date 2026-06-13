"""Executable solution for arn_caf_qa_000912.

EMI: loan 100000, 12 monthly instalments, 12% p.a. compounded monthly.
(1.01)^12 = 1.1268. Find EMI (nearest rupee).
Options: 1=8886  2=9333  3=8333  4=7886
"""


def solve():
    p = 100000
    i = 0.12 / 12      # monthly rate = 0.01
    pw = 1.1268        # (1.01)^12
    emi = p * i * pw / (pw - 1)
    return {"value": round(emi), "option_key": 1}


if __name__ == "__main__":
    print(solve())
