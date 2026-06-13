import math


def solve():
    # Marks (class marks) and frequencies; assumed mean A = 15.
    xs = [15, 25, 35, 45, 55]
    fs = [8, 12, 15, 10, 5]
    A = 15
    N = sum(fs)
    # Deviations d = x - A.
    fd = sum(f * (x - A) for x, f in zip(xs, fs))
    fd2 = sum(f * (x - A) ** 2 for x, f in zip(xs, fs))
    mean = A + fd / N
    # Variance via assumed-mean shortcut WITH the correction term (Sigma d / N)^2.
    var = fd2 / N - (fd / N) ** 2
    sd = math.sqrt(var)
    cv = sd / mean * 100
    return {"value": round(cv, 2), "option_key": 2}


if __name__ == "__main__":
    print(solve())
