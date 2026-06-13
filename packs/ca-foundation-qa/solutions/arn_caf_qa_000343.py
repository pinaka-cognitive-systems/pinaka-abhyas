def solve():
    # F = 4S, F+5 = 3(S+5)
    # 4S + 5 = 3S + 15 => S = 10, F = 40
    S = 15 - 5  # 4S+5=3S+15 => S = 10
    F = 4 * S
    return {"value": F, "option_key": 2}

if __name__ == "__main__":
    print(solve())
