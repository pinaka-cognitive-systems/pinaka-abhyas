"""Executable solution for arn_caf_qa_000203.

Contract: solve() returns {"value": <computed>, "option_key": <int>}.

X ranks: 1, 2, 3, 4
Y ranks: 2, 1, 4, 3
d_i = X_i - Y_i: -1, 1, -1, 1
sum(d^2) = 1+1+1+1 = 4
n = 4
r_s = 1 - 6*sum(d^2) / (n*(n^2 - 1)) = 1 - 24/60 = 0.6
Correct option: 3 (text "0.6").
"""


def solve():
    x_ranks = [1, 2, 3, 4]
    y_ranks = [2, 1, 4, 3]
    n = len(x_ranks)
    sum_d_sq = sum((xi - yi) ** 2 for xi, yi in zip(x_ranks, y_ranks))  # 4
    r_s = 1 - 6 * sum_d_sq / (n * (n ** 2 - 1))  # 1 - 24/60 = 0.6
    return {"value": round(r_s, 10), "option_key": 3}


if __name__ == "__main__":
    print(solve())
