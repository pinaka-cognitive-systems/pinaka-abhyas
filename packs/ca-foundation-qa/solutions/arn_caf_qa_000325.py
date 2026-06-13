def solve():
    # 4^x / 2^x = 8
    # (4/2)^x = 8
    # 2^x = 8 = 2^3
    # x = 3
    x = 3
    # options: 1->3, 2->2, 3->4, 4->1
    option_map = {3: 1, 2: 2, 4: 3, 1: 4}
    option_key = option_map[x]
    return {"value": x, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
