def solve():
    technical = [1, 2, 3, 4, 5, 6, 7]
    communication = [1, 3, 2, 4, 6, 5, 7]
    n = len(technical)
    sum_d2 = sum((a - b) ** 2 for a, b in zip(technical, communication))
    r_s = 1 - 6 * sum_d2 / (n * (n**2 - 1))
    # r_s = 13/14 = 0.9286 -> option 1
    return {"value": round(r_s, 4), "option_key": 1}

if __name__ == "__main__":
    print(solve())
