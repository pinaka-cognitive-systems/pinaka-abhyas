"""Executable solution for arn_caf_qa_000164.

Contract (ADR 0005): solve() returns {"value": <computed answer>, "option_key": <int>}.
Options after shuffle: 1=8  2=16  3=4  4=2
(2^2 * 2^3) / 2^3 = 2^(2+3-3) = 2^2 = 4.
"""


def solve():
    # Index law: a^m * a^n = a^(m+n), a^m / a^n = a^(m-n)
    exponent = 2 + 3 - 3  # = 2
    result = 2 ** exponent  # = 4
    # After shuffle: option key 3 = 4
    option_key = 3
    return {"value": result, "option_key": option_key}


if __name__ == "__main__":
    print(solve())
