def solve():
    # x=2 is root of x^3 - k*x^2 + 5x - 2 = 0
    # 8 - 4k + 10 - 2 = 0 => 16 - 4k = 0 => k = 4
    x = 2
    # 16 - 4k = 0
    k = (x**3 + 5*x - 2) / (x**2)
    k = int(round(k))
    # verify
    assert x**3 - k*x**2 + 5*x - 2 == 0, f"verification failed with k={k}"
    # option mapping: 1->2, 2->3, 3->4, 4->5
    options = {1: 2, 2: 3, 3: 4, 4: 5}
    for opt_k, v in options.items():
        if v == k:
            return {"value": k, "option_key": opt_k}

if __name__ == "__main__":
    print(solve())
