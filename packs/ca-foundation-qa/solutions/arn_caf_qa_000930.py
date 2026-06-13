def solve():
    # Missing frequency f1 given the median of a grouped distribution.
    # Classes 0-10, 10-20, 20-30, 30-40, 40-50 with frequencies 5, f1, 20, 10, 8.
    # Median is given as 24, which falls in the 20-30 class.
    # Median = L + ((N/2 - cf)/f) * h, where for class 20-30:
    #   L = 20, h = 10, f = 20, cf (before) = 5 + f1, N = 43 + f1.
    # 24 = 20 + (((43 + f1)/2 - (5 + f1))/20) * 10
    # Solve the linear equation for f1.
    # 4 = ((43 + f1)/2 - 5 - f1)/2
    # 8 = 21.5 + 0.5*f1 - 5 - f1
    # 8 = 16.5 - 0.5*f1
    # 0.5*f1 = 8.5  ->  f1 = 17
    L, h, f = 20, 10, 20
    median = 24
    # Express cf and N in terms of f1 and invert.
    # ((43 + f1)/2 - (5 + f1)) = (median - L) * f / h
    rhs = (median - L) * f / h          # = 8
    # (43 + f1)/2 - 5 - f1 = rhs  ->  16.5 - 0.5*f1 = rhs  ->  f1 = (16.5 - rhs)/0.5
    f1 = (16.5 - rhs) / 0.5
    return {"value": int(round(f1)), "option_key": 2}


if __name__ == "__main__":
    print(solve())
