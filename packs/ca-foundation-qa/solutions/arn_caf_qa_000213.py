"""Executable solution for arn_caf_qa_000213.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

r = sqrt(byx * bxy) = sqrt(0.8 * 0.2) = sqrt(0.16) = 0.40
Correct option: 3 (text "0.40").
"""
import math


def solve():
    byx = 0.8
    bxy = 0.2
    r = math.sqrt(byx * bxy)  # sqrt(0.16) = 0.40
    return {"value": round(r, 2), "option_key": 3}


if __name__ == "__main__":
    print(solve())
