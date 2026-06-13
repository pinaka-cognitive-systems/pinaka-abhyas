def solve():
    n = 8
    s = (n * (n + 1) // 2) ** 2
    assert s == 1296
    return {"value": s, "option_key": 1}

if __name__ == "__main__":
    print(solve())
