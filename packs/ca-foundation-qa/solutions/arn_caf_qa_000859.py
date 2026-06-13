def solve():
    r_s = 0.75
    sum_d2 = 21
    # n*(n^2-1) = 6*sum_d2/(1-r_s)
    target = 6 * sum_d2 / (1 - r_s)
    # target = 504; find n such that n*(n^2-1) = 504
    n = None
    for candidate in range(2, 30):
        if candidate * (candidate**2 - 1) == target:
            n = candidate
            break
    # n=8 -> option 3
    return {"value": n, "option_key": 3}

if __name__ == "__main__":
    print(solve())
