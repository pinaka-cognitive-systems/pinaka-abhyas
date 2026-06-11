"""Executable solution for arn_caf_qa_000222.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

Histogram data (frequency density per mark, class width):
  0-20:  density=3, width=20 => frequency = 3 * 20 = 60
  20-30: density=2, width=10 => frequency = 2 * 10 = 20
  30-40: density=1, width=10 => frequency = 1 * 10 = 10
  40-50: density=1, width=10 => frequency = 1 * 10 = 10
  Total = 100.

Frequency for class 0-20 = 3 * 20 = 60.
Correct option: 4 (text "60").
"""


def solve():
    density_0_20 = 3
    width_0_20 = 20  # class 0 to 20 has width 20
    frequency = density_0_20 * width_0_20  # 60
    return {"value": frequency, "option_key": 4}


if __name__ == "__main__":
    print(solve())
