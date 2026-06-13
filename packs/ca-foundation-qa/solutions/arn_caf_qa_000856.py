def solve():
    r1 = [1, 2, 3, 4, 5, 6, 7, 8]
    r2 = [2, 1, 4, 3, 6, 5, 8, 7]
    n = len(r1)
    sum_d2 = sum((a - b) ** 2 for a, b in zip(r1, r2))
    r_s = 1 - 6 * sum_d2 / (n * (n**2 - 1))
    # r_s = 19/21 = 0.9048 -> option 1
    return {"value": round(r_s, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
