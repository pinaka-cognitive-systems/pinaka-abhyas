"""Executable solution for arn_caf_qa_000015.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=34  2=41  3=42  4=18

Number series: 2, 6, 12, 20, 30, ?
Pattern: n*(n+1) for n=1,2,3,4,5,6.
  Term 1 = 1*2 = 2, Term 2 = 2*3 = 6, ..., Term 6 = 6*7 = 42.
"""


def solve():
    # Generate the series up to term 6 using the n*(n+1) formula.
    series = [n * (n + 1) for n in range(1, 7)]
    # Verify the known terms
    assert series[:5] == [2, 6, 12, 20, 30]

    next_term = series[5]  # 42

    # option 3 = 42
    option_key = 3
    return {"value": next_term, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
