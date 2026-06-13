import math


def solve():
    # Quartile deviation of a grouped distribution: need Q1 and Q3 by interpolation.
    classes = [(0, 10), (10, 20), (20, 30), (30, 40), (40, 50)]
    f = [6, 10, 18, 12, 4]
    h = 10
    N = sum(f)
    # Cumulative frequencies.
    cf = []
    s = 0
    for x in f:
        s += x
        cf.append(s)  # [6, 16, 34, 46, 50]

    def quartile(position):
        # Locate the class whose cumulative frequency first reaches `position`.
        for i, c in enumerate(cf):
            if c >= position:
                L = classes[i][0]
                cf_before = cf[i - 1] if i > 0 else 0
                return L + ((position - cf_before) / f[i]) * h

    Q1 = quartile(N / 4)        # 12.5 -> class 10-20
    Q3 = quartile(3 * N / 4)    # 37.5 -> class 30-40
    QD = (Q3 - Q1) / 2
    return {"value": round(QD, 2), "option_key": 3}


if __name__ == "__main__":
    print(solve())
