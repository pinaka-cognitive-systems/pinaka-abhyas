import math


def solve():
    # Two groups; find the COMBINED standard deviation.
    n1, m1, s1 = 100, 50, 5
    n2, m2, s2 = 150, 60, 6
    # Step 1: combined mean.
    mc = (n1 * m1 + n2 * m2) / (n1 + n2)
    # Step 2: deviations of each group mean from the combined mean.
    d1 = m1 - mc
    d2 = m2 - mc
    # Step 3: pooled variance = [n1(s1^2 + d1^2) + n2(s2^2 + d2^2)] / (n1 + n2).
    var_c = (n1 * (s1 ** 2 + d1 ** 2) + n2 * (s2 ** 2 + d2 ** 2)) / (n1 + n2)
    sd_c = math.sqrt(var_c)
    return {"value": round(sd_c, 2), "option_key": 4}


if __name__ == "__main__":
    print(solve())
