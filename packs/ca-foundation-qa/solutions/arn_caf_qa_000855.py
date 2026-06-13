def solve():
    n = 6
    sum_d2 = 21
    r_s = 1 - 6 * sum_d2 / (n * (n**2 - 1))
    # r_s = 1 - 126/210 = 1 - 0.6 = 0.4 -> option 1
    return {"value": round(r_s, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
