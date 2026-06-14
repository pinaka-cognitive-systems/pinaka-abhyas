"""Executable solution for arn_caf_qa_000973.

Given 11^3 + ... + n^3 = 8000, recover n via the cube identity, then
compute 11^2 + ... + n^2 as a difference of square-sum prefixes.
Options: 1=630  2=1015  3=434  4=3780
"""


def sum_cubes(m):
    t = m * (m + 1) // 2
    return t * t


def sum_squares(m):
    return m * (m + 1) * (2 * m + 1) // 6


def solve():
    target_cubes = 8000
    lower = 10  # range starts at 11, so subtract the 1..10 block
    total_cubes = target_cubes + sum_cubes(lower)  # (n(n+1)/2)^2

    # recover n: n(n+1)/2 = sqrt(total_cubes)
    tri = round(total_cubes ** 0.5)
    assert tri * tri == total_cubes
    # solve n(n+1)/2 = tri  ->  n(n+1) = 2*tri
    n = int(((1 + 8 * tri) ** 0.5 - 1) / 2 + 0.5)
    assert n * (n + 1) // 2 == tri

    answer = sum_squares(n) - sum_squares(lower)

    # direct check
    assert sum(k ** 3 for k in range(11, n + 1)) == target_cubes
    assert sum(k ** 2 for k in range(11, n + 1)) == answer

    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
