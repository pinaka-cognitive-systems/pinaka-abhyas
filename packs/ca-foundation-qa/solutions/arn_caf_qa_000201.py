"""Executable solution for arn_caf_qa_000201.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Cumulative frequency table (upper boundary: cf):
  10: 4, 20: 12, 30: 25, 40: 36, 50: 40
Frequency in (30, 40] = cf(40) - cf(30) = 36 - 25 = 11.
Correct option: 1 (text "11").
"""


def solve():
    cf = {10: 4, 20: 12, 30: 25, 40: 36, 50: 40}
    freq_30_40 = cf[40] - cf[30]  # 36 - 25 = 11
    return {"value": freq_30_40, "option_key": 1}


if __name__ == "__main__":
    print(solve())
