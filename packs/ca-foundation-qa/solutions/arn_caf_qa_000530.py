def solve():
    # f(x) = sqrt((x-1)/(x^2-4))
    # Need (x-1)/(x^2-4) >= 0 and x^2-4 != 0
    # Critical points: x = -2, 1, 2
    import math

    def is_in_domain(x):
        denom = x * x - 4
        if denom == 0:
            return False
        ratio = (x - 1) / denom
        return ratio >= 0

    # Enumerate sample points in each region
    test_cases = [
        (-3, False),   # x < -2
        (-2, False),   # x = -2 (denominator zero)
        (-1, True),    # -2 < x < 1
        (0, True),     # -2 < x < 1
        (1, True),     # x = 1 (ratio = 0, valid)
        (1.5, False),  # 1 < x < 2 (ratio negative)
        (2, False),    # x = 2 (denominator zero)
        (3, True),     # x > 2
        (10, True),    # x > 2
    ]

    for x, expected in test_cases:
        result = is_in_domain(x)
        assert result == expected, f"x={x}: expected {expected}, got {result}"

    # Domain: (-2, 1] union (2, infinity) -> option 1
    return {"value": 1, "option_key": 1}

if __name__ == "__main__":
    print(solve())
