def solve():
    # f(x) = sqrt(x - 3)
    # Domain: x - 3 >= 0 => x >= 3
    import math

    # Verify boundary: x=3 gives sqrt(0)=0 which is valid
    assert math.sqrt(3 - 3) == 0.0

    # Verify x < 3 is invalid
    try:
        math.sqrt(2 - 3)  # sqrt(-1) should raise or give nan
        invalid = False
    except ValueError:
        invalid = True
    assert invalid

    # Domain is x >= 3, which is option 2
    return {"value": 2, "option_key": 2}

if __name__ == "__main__":
    print(solve())
