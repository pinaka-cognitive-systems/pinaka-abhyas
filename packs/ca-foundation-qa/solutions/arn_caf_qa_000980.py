"""Executable solution for arn_caf_qa_000980.

Grouped step-deviation mean and SD of units, then transform
score = 2*units + 5; find CV of scores to one decimal place.
Mid-values 10,30,50,70,90; freq 2,6,10,10,12.
Options: 1=37.2%  2=38.7%  3=41.1%  4=18.6%
"""
import math


def solve():
    mids = [10, 30, 50, 70, 90]
    f = [2, 6, 10, 10, 12]
    A = 50
    h = 20
    N = sum(f)
    u = [(m - A) // h for m in mids]
    Sfu = sum(f[i] * u[i] for i in range(len(f)))
    Sfu2 = sum(f[i] * u[i] * u[i] for i in range(len(f)))
    mean = A + h * (Sfu / N)
    var = h * h * (Sfu2 / N - (Sfu / N) ** 2)
    sd = math.sqrt(var)
    # transform y = 2x + 5
    a, b = 2, 5
    new_mean = a * mean + b
    new_sd = abs(a) * sd
    cv = new_sd / new_mean * 100
    return {"value": round(cv, 1), "option_key": 1}


if __name__ == "__main__":
    print(solve())
