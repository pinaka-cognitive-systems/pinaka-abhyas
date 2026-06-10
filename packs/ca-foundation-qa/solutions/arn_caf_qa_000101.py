"""Executable solution for arn_caf_qa_000101.

Contract: solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=16  2=16.43  3=14  4=18

Marks: 12, 18, 9, 25, 14, 21, 16. Find the median.
"""


def solve():
    marks = [12, 18, 9, 25, 14, 21, 16]
    marks_sorted = sorted(marks)  # [9, 12, 14, 16, 18, 21, 25]
    n = len(marks_sorted)         # 7

    # Median for odd n: position (n+1)/2 = 4th element (1-indexed)
    median_index = (n - 1) // 2   # 3 (0-indexed)
    median = marks_sorted[median_index]  # 16

    # option 1 = 16
    option_key = 4
    return {"value": median, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
