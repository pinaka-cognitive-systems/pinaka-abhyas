def solve():
    # 2^x = 32
    # 32 = 2^5
    x = 5
    # Map x to option key
    options = {4: 1, 5: 2, 6: 3, 3: 4}
    option_key = options[x]
    return {"value": x, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
