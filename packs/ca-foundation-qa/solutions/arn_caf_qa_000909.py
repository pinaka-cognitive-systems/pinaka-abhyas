"""Executable solution for arn_caf_qa_000909.

Annuity due: Rs 5000 at the beginning of each year, 4 years, 10% p.a.
(1.10)^4 = 1.4641. Find accumulated amount.
Options: 1=25525.50  2=23205.00  3=20000.00  4=28078.05
"""


def solve():
    r = 5000
    i = 0.10
    pow4 = 1.4641  # (1.10)^4
    ordinary_fv = r * (pow4 - 1) / i          # 23205
    annuity_due_fv = ordinary_fv * (1 + i)    # 25525.5
    return {"value": round(annuity_due_fv, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
