def solve():
    n = 10
    s = n * (n + 1) // 2
    assert s == 55
    return {"value": s, "option_key": 1}

if __name__ == "__main__":
    print(solve())
