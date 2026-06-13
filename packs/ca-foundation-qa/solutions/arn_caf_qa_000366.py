from fractions import Fraction

def solve():
    # Solve 2x + y = 10 and x + 2y = 10
    # Subtract: x - y = 0 => x = y
    # 3x = 10 => x = 10/3
    x = Fraction(10, 3)
    y = Fraction(10, 3)
    assert 2*x + y == 10
    assert x + 2*y == 10
    # option key 1 text is "(10/3, 10/3)"
    return {"value": str((x, y)), "option_key": 1}

if __name__ == "__main__":
    print(solve())
