import math


def solve():
    # Two series of returns. Decide which is MORE CONSISTENT (lower CV).
    A = [100, 120, 80, 110, 90]
    B = [20, 30, 25, 15, 10]

    def cv(d):
        n = len(d)
        m = sum(d) / n
        var = sum((x - m) ** 2 for x in d) / n
        sd = math.sqrt(var)
        return m, sd, sd / m * 100

    mA, sA, cvA = cv(A)
    mB, sB, cvB = cv(B)
    # More consistent = smaller coefficient of variation.
    # A: CV = 14.14%, B: CV = 35.36%, so A is more consistent even though A has the larger SD.
    more_consistent_is_A = cvA < cvB
    # Option 1 states "Series A, because its CV is the lower at 14.14%".
    return {"value": round(cvA, 2), "option_key": 1 if more_consistent_is_A else 3}


if __name__ == "__main__":
    print(solve())
