"""Executable solution for arn_caf_qa_000019.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options: 1=0.20  2=0.65  3=0.60  4=0.40

Addition theorem: P(A or B) = P(A) + P(B) - P(A and B).
P(chess) = 0.30, P(carrom) = 0.50, P(both) = 0.20.
"""


def solve():
    p_chess = 0.30
    p_carrom = 0.50
    p_both = 0.20

    p_chess_or_carrom = p_chess + p_carrom - p_both  # 0.60

    # option 3 = 0.60
    option_key = 3
    return {"value": round(p_chess_or_carrom, 10), "option_key": option_key}


if __name__ == "__main__":
    print(solve())
