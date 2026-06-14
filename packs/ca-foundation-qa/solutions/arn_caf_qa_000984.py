"""Executable solution for arn_caf_qa_000984.

Find the missing frequency f from a given median via grouped-median
interpolation. Classes 0-10..40-50, freq 6, f, 20, 16, 8; total 64;
median 26.
Options: 1=14  2=46  3=38  4=2
"""


def solve():
    N = 64
    h = 10
    L = 20          # median class 20-30
    f_class = 20    # frequency of median class
    cf_known = 6    # frequency before the unknown class
    median = 26
    # median = L + ((N/2 - (cf_known + f)) / f_class) * h
    f = N / 2 - cf_known - (median - L) / h * f_class
    return {"value": round(f), "option_key": 1}


if __name__ == "__main__":
    print(solve())
