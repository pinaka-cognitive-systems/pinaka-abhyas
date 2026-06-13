def solve():
    # n=8 students, sum of squared rank differences D2=21
    # One tied group: m=2 students received same rank from Judge 1
    # Corrected Spearman: r_s = 1 - 6*(D2 + T) / (n*(n^2 - 1))
    # where T = (m^3 - m)/12 for each tied group
    n = 8
    sum_d2 = 21
    # correction for one tied group of m=2
    m = 2
    T = (m**3 - m) / 12  # = 0.5
    corrected_sum = sum_d2 + T  # = 21.5
    denominator = n * (n**2 - 1)  # = 8 * 63 = 504
    r_s = 1 - (6 * corrected_sum) / denominator  # = 1 - 129/504 = 0.7440...
    # Closest option: 0.75 -> option_key 1
    return {"value": round(r_s, 4), "option_key": 1}


if __name__ == "__main__":
    print(solve())
