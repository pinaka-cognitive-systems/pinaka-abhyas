"""Executable solution for arn_caf_qa_000910.

Sinking fund: machine cost 200000, scrap 20000, 5 years, 8% p.a.
(1.08)^5 = 1.4693. Find the equal year-end deposit (nearest rupee).
Options: 1=30684  2=34093  3=36000  4=9801
"""


def solve():
    cost = 200000
    scrap = 20000
    target = cost - scrap   # 180000 net outlay
    i = 0.08
    pow5 = 1.4693           # (1.08)^5
    deposit = target * i / (pow5 - 1)
    return {"value": round(deposit), "option_key": 1}


if __name__ == "__main__":
    print(solve())
