"""Executable solution for arn_caf_qa_000974.

Series term k*(k+3). Given sum of first n terms = 1330, recover n, then
sum the next three terms (k = n+1, n+2, n+3).
Options: 1=914  2=812  3=818  4=270
"""


def term(k):
    return k * (k + 3)


def sum_to(n):
    # sum k(k+3) = sum k^2 + 3 sum k
    return n * (n + 1) * (2 * n + 1) // 6 + 3 * n * (n + 1) // 2


def solve():
    target = 1330
    n = None
    for cand in range(1, 100):
        if sum_to(cand) == target:
            n = cand
            break
    assert n is not None

    answer = term(n + 1) + term(n + 2) + term(n + 3)

    # direct check of the recovered sum
    assert sum(term(k) for k in range(1, n + 1)) == target
    return {"value": answer, "option_key": 1}


if __name__ == "__main__":
    print(solve())
