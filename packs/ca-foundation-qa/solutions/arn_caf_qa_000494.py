def solve():
    # Sum of 2^2 + 4^2 + ... + 20^2 = 4*(1^2+...+10^2)
    n = 10
    inner = n * (n + 1) * (2 * n + 1) // 6  # 385
    total = 4 * inner  # 1540
    assert total == sum((2*k)**2 for k in range(1, 11))
    return {"value": total, "option_key": 2}

if __name__ == "__main__":
    print(solve())
