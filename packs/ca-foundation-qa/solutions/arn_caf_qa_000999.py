"""Executable solution for arn_caf_qa_000999.

8 pairs, reported Spearman r = 0.75. Two corrections: d = -4 to d = +4 (inert,
since d is squared) and d = 2 to d = 5 (real). Recover Sigma d^2 and recompute.
Options: 1=0.5  2=0.75  3=0.25  4=0.71
"""


def solve():
    n = 8
    den = n * (n * n - 1)          # 504
    r_reported = 0.75
    s_old = den * (1 - r_reported) / 6     # 21
    # sign-only fix: (-4)^2 == (+4)^2, no change
    s_new = s_old - (-4) ** 2 + 4 ** 2     # unchanged
    # magnitude fix: 2 -> 5
    s_new = s_new - 2 ** 2 + 5 ** 2        # +21 -> 42
    r_new = 1 - 6 * s_new / den            # 0.5
    return {"value": round(r_new, 4), "option_key": 1}


if __name__ == "__main__":
    print(solve())
