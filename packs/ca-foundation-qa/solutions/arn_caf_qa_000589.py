def solve():
    candidates = [
        {"key": 1, "value": 4},
        {"key": 2, "value": 9},
        {"key": 3, "value": 25},
        {"key": 4, "value": 35}
    ]
    import math
    def is_perfect_square(n):
        r = int(math.isqrt(n))
        return r * r == n

    odd_ones = [c for c in candidates if not is_perfect_square(c["value"])]
    assert len(odd_ones) == 1, "Expected exactly one odd-one-out"
    result = odd_ones[0]
    return {"value": result["value"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
