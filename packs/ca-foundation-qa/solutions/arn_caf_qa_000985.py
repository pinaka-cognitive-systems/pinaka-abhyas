"""Executable solution for arn_caf_qa_000985.

Two missing frequencies a, b. Total = 70, median = 28. Solve for a
(the 10-20 class) via grouped-median interpolation.
Classes 0-10..40-50, freq 5, a, 20, b, 8.
Options: 1=14  2=23  3=22  4=49
"""


def solve():
    N = 70
    h = 10
    L = 20          # median class 20-30
    f_class = 20    # frequency of median class
    cf_known = 5    # frequency before the unknown class (the 0-10 class)
    median = 28
    # median = L + ((N/2 - (cf_known + a)) / f_class) * h
    a = N / 2 - cf_known - (median - L) / h * f_class
    return {"value": round(a), "option_key": 1}


if __name__ == "__main__":
    print(solve())
