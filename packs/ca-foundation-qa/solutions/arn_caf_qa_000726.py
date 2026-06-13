def solve():
    v1, v2 = 15, 10
    # Average speed for equal distances = HM of v1 and v2
    hm = 2 * v1 * v2 / (v1 + v2)
    # hm = 300/25 = 12 -> option 1
    return {"value": hm, "option_key": 1}

if __name__ == "__main__":
    print(solve())
