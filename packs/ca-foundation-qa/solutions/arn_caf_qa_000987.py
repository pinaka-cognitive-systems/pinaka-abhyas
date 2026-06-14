"""Executable solution for arn_caf_qa_000987.

Grouped quartile deviation: interpolate both Q1 (at N/4) and Q3 (at 3N/4),
then QD = (Q3 - Q1)/2.
Classes 0-10..40-50, freq 5, 10, 15, 12, 6.
Options: 1=9  2=18  3=19  4=4.5
"""


def solve():
    f = [5, 10, 15, 12, 6]
    h = 10
    N = sum(f)
    cum = []
    c = 0
    for x in f:
        c += x
        cum.append(c)

    def quartile(pos):
        prev = 0
        for i, cm in enumerate(cum):
            if cm >= pos:
                L = i * h
                return L + ((pos - prev) / f[i]) * h
            prev = cm
        return None

    Q1 = quartile(N / 4)
    Q3 = quartile(3 * N / 4)
    qd = (Q3 - Q1) / 2
    return {"value": round(qd, 2), "option_key": 1}


if __name__ == "__main__":
    print(solve())
