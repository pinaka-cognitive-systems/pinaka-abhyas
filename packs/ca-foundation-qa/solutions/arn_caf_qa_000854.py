def solve():
    pairs = [(1, 2), (2, 1), (3, 4), (4, 5), (5, 3)]
    sum_d2 = sum((r1 - r2) ** 2 for r1, r2 in pairs)
    # sum_d2 = 8 -> option 3
    return {"value": sum_d2, "option_key": 3}

if __name__ == "__main__":
    print(solve())
