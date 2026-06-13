def solve():
    # Coins Rs1:Rs2:Rs5 = 4k:3k:k; total value = 15k = 120 => k = 8
    total_value = 120
    # value equation: 4k*1 + 3k*2 + k*5 = 15k
    value_per_k = 4 * 1 + 3 * 2 + 1 * 5  # = 15
    k = total_value // value_per_k  # = 8
    coins_5 = 1 * k  # = 8
    return {"value": coins_5, "option_key": 1}

if __name__ == "__main__":
    print(solve())
