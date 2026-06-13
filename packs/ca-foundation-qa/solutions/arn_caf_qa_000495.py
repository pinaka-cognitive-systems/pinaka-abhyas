def solve():
    n = 9
    # Sum k*(k+1) for k=1..n = n*(n+1)*(n+2)/3
    s = n * (n + 1) * (n + 2) // 3
    assert s == sum(k * (k + 1) for k in range(1, n + 1))
    assert s == 330
    return {"value": s, "option_key": 1}

if __name__ == "__main__":
    print(solve())
