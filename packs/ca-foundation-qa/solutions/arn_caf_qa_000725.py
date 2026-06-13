def solve():
    data = [2, 3, 6]
    n = len(data)
    hm = n / sum(1/x for x in data)
    # hm = 3 / (0.5 + 0.333 + 0.167) = 3 / 1 = 3 -> option 1
    return {"value": hm, "option_key": 1}

if __name__ == "__main__":
    print(solve())
