def solve():
    # Series: 1, 4, 9, 16, 25, ?
    series = [1, 4, 9, 16, 25]
    import math
    # Verify each term is a perfect square
    for i, term in enumerate(series):
        assert int(math.isqrt(term)) ** 2 == term
        assert math.isqrt(term) == i + 1
    n = len(series) + 1
    next_term = n * n  # 6^2 = 36
    options = {1: 30, 2: 35, 3: 36, 4: 49}
    option_key = [k for k, v in options.items() if v == next_term][0]
    return {"value": next_term, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
