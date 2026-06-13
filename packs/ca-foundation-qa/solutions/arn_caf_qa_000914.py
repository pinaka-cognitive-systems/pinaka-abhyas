"""Executable solution for arn_caf_qa_000914.

7 people at a round table; two particular people NOT adjacent. Count arrangements.
Options: 1=480  2=240  3=600  4=720
"""

from math import factorial


def solve():
    n = 7
    total = factorial(n - 1)                 # (7-1)! = 720
    together = factorial(n - 2) * factorial(2)  # block: (6-1)! * 2! = 240
    not_together = total - together           # 480
    return {"value": not_together, "option_key": 1}


if __name__ == "__main__":
    print(solve())
