"""Executable solution for arn_caf_qa_000978.

Grouped CV by step-deviation. Classes 0-10..40-50, freq 8,12,20,7,3.
A = 25, h = 10. CV to nearest whole percent.
Options: 1=49%  2=51%  3=43%  4=16%
"""
import math


def solve():
    mids = [5, 15, 25, 35, 45]
    f = [8, 12, 20, 7, 3]
    A = 25
    h = 10
    N = sum(f)
    u = [(m - A) // h for m in mids]
    Sfu = sum(f[i] * u[i] for i in range(len(f)))
    Sfu2 = sum(f[i] * u[i] * u[i] for i in range(len(f)))
    mean = A + h * (Sfu / N)
    variance = h * h * (Sfu2 / N - (Sfu / N) ** 2)
    sd = math.sqrt(variance)
    cv = sd / mean * 100
    return {"value": round(cv), "option_key": 1}


if __name__ == "__main__":
    print(solve())
