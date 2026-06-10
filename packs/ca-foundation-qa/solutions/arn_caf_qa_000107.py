"""Executable solution for arn_caf_qa_000107.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=7.5  2=15  3=15.5  4=8

Dataset (n=9): 4, 7, 9, 12, 15, 18, 21, 25, 30.
Quartile deviation = (Q3 - Q1) / 2.
"""


def solve():
    data = [4, 7, 9, 12, 15, 18, 21, 25, 30]
    n = len(data)  # 9

    # Q1 position = (n+1)/4 = 2.5 -> interpolate between index 1 and 2
    q1_pos = (n + 1) / 4  # 2.5
    q1_lower_idx = int(q1_pos) - 1      # index 1 (2nd value)
    q1_upper_idx = q1_lower_idx + 1     # index 2 (3rd value)
    q1_frac = q1_pos - int(q1_pos)      # 0.5
    q1 = data[q1_lower_idx] + q1_frac * (data[q1_upper_idx] - data[q1_lower_idx])
    # 7 + 0.5*(9-7) = 7 + 1 = 8

    # Q3 position = 3*(n+1)/4 = 7.5 -> interpolate between index 6 and 7
    q3_pos = 3 * (n + 1) / 4  # 7.5
    q3_lower_idx = int(q3_pos) - 1      # index 6 (7th value)
    q3_upper_idx = q3_lower_idx + 1     # index 7 (8th value)
    q3_frac = q3_pos - int(q3_pos)      # 0.5
    q3 = data[q3_lower_idx] + q3_frac * (data[q3_upper_idx] - data[q3_lower_idx])
    # 21 + 0.5*(25-21) = 21 + 2 = 23

    qd = (q3 - q1) / 2  # (23 - 8) / 2 = 7.5

    # option 1 = 7.5
    option_key = 3
    return {"value": qd, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
