def solve():
    # milk = 5k, water = 3k; after adding 8 litres water, ratio = 5:5
    # 5k = 3k + 8 => k = 4
    k = 4
    milk = 5 * k  # 20
    return {"value": milk, "option_key": 2}

if __name__ == "__main__":
    print(solve())
