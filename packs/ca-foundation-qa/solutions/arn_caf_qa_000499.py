def solve():
    # R(x) = 5x^2 + 3x
    # dR/dx = 10x + 3
    x = 4
    mr = 10 * x + 3
    # Options: 1->43, 2->40, 3->47, 4->88
    option_key = 1 if mr == 43 else None
    return {"value": mr, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
