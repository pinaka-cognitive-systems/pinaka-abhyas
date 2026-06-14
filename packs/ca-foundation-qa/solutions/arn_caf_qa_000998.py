"""Executable solution for arn_caf_qa_000998.

10 pairs, reported Spearman r = 0.8. One rank difference recorded as d = 4
should have been d = 7. Recover Sigma d^2, swap the squared term, recompute r.
Options: 1=0.6  2=0.8  3=0.93  4=1.0
"""


def solve():
    n = 10
    den = n * (n * n - 1)          # 990
    r_reported = 0.8
    # r = 1 - 6*S/den  =>  S = den*(1 - r)/6
    s_old = den * (1 - r_reported) / 6   # 33
    s_new = s_old - 4 ** 2 + 7 ** 2      # 33 - 16 + 49 = 66
    r_new = 1 - 6 * s_new / den          # 0.6
    return {"value": round(r_new, 4), "option_key": 1}


if __name__ == "__main__":
    print(solve())
