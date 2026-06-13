def solve():
    n = 12
    s = n * (n + 1) * (2 * n + 1) // 6
    assert s == 650
    return {"value": s, "option_key": 1}

if __name__ == "__main__":
    print(solve())
