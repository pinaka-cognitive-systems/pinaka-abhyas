"""Executable solution for arn_caf_qa_000224.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Frequency distribution of marks for 60 students (5 classes):
  0-10:  5
  10-20: ? (missing)
  20-30: 18
  30-40: 14
  40-50: 7
  Total: 60

Missing frequency = 60 - (5 + 18 + 14 + 7) = 60 - 44 = 16.
Correct option: 2 (text "16").
"""


def solve():
    total = 60
    known = [5, 18, 14, 7]
    missing = total - sum(known)  # 60 - 44 = 16
    return {"value": missing, "option_key": 2}


if __name__ == "__main__":
    print(solve())
