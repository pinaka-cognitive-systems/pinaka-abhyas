"""Executable solution for arn_caf_qa_001006.

Deflate money income to real income, then percentage change.
real = money income / index * 100.
Options: 1=fell ~7.14%  2=rose 30%  3=fell 10%  4=rose 82%
"""


def solve():
    n0, cpi0 = 40000, 125
    n1, cpi1 = 52000, 175
    real0 = n0 / cpi0 * 100      # 32000
    real1 = n1 / cpi1 * 100      # 29714.28...
    pct = (real1 - real0) / real0 * 100   # -7.14...
    return {"value": round(pct, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
