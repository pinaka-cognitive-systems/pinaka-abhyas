def solve():
    mean = 45
    median = 42
    # Empirical relation: Mode = 3*Median - 2*Mean
    mode = 3 * median - 2 * mean
    # mode = 126 - 90 = 36 -> option 1
    return {"value": mode, "option_key": 1}

if __name__ == "__main__":
    print(solve())
