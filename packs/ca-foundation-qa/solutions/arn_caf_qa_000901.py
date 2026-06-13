"""Executable solution for arn_caf_qa_000901.

x^2 - 5x + k = 0 has roots alpha, beta. Given alpha^3 + beta^3 = 35, find k.
Options: 1=6  2=30  3=-6  4=10
"""


def solve():
    s = 5          # alpha + beta = -(-5)/1
    target = 35    # alpha^3 + beta^3
    # alpha^3 + beta^3 = s^3 - 3*P*s = target  =>  P = (s^3 - target) / (3*s)
    p = (s ** 3 - target) / (3 * s)
    k = p          # product of roots = k
    return {"value": k, "option_key": 1}


if __name__ == "__main__":
    print(solve())
