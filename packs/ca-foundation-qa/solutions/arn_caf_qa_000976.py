"""Executable solution for arn_caf_qa_000976.

x^2 - 4x + p = 0 has roots a, b with a^3 + b^3 = 28. Recover p via the
cube-sum identity, then compute a^4 + b^4 through symmetric powers.
Options: 1=82  2=94  3=100  4=118
"""


def solve():
    S = 4              # a + b
    cube_sum = 28      # a^3 + b^3
    # a^3 + b^3 = S^3 - 3*P*S  ->  P = (S^3 - cube_sum) / (3*S)
    P = (S ** 3 - cube_sum) / (3 * S)   # a*b = p
    sq_sum = S ** 2 - 2 * P             # a^2 + b^2
    answer = sq_sum ** 2 - 2 * P ** 2   # a^4 + b^4

    # cross-check with explicit roots
    import math
    disc = S ** 2 - 4 * P
    a = (S + math.sqrt(disc)) / 2
    b = (S - math.sqrt(disc)) / 2
    assert abs((a ** 3 + b ** 3) - cube_sum) < 1e-9
    assert abs((a ** 4 + b ** 4) - answer) < 1e-9

    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
