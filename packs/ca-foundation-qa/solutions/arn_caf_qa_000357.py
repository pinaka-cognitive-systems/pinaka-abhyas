def solve():
    # 5 - 2x >= 11 => -2x >= 6 => x <= -3
    # verify: x=-3 satisfies (boundary), x=-4 satisfies, x=-2 does not
    assert 5 - 2*(-3) >= 11   # boundary
    assert 5 - 2*(-4) >= 11   # interior
    assert not (5 - 2*(-2) >= 11)  # outside
    # Answer is x <= -3, which corresponds to option 2
    # "value" is the boundary point
    return {"value": -3, "option_key": 2}

if __name__ == "__main__":
    print(solve())
