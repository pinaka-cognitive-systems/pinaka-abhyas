"""Executable solution for arn_caf_qa_000992.

Odds against 3:2 and 7:3 -> P(break) = b/(a+b) = 0.4 and 0.3.
Independent; P(exactly one breaks).
Options: 1=0.46  2=0.58  3=0.12  4=0.70
"""


def solve():
    # odds against a to b -> P = b/(a+b)
    p1 = 2 / (3 + 2)              # 0.4
    p2 = 3 / (7 + 3)             # 0.3
    exactly_one = p1 * (1 - p2) + p2 * (1 - p1)   # 0.28 + 0.18 = 0.46
    value = round(exactly_one, 2)
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
