def solve():
    candidates = {
        1: (30, 20),
        2: (10, 30),
        3: (10, 20),
        4: (20, 25)
    }
    best_key = None
    best_profit = -1
    for key, (x, y) in candidates.items():
        if 200*x + 300*y <= 12000 and x >= 10 and y >= 20:
            profit = 50*x + 60*y
            if profit > best_profit:
                best_profit = profit
                best_key = key
    assert best_key == 1 and best_profit == 2700
    return {"value": best_profit, "option_key": best_key}

if __name__ == "__main__":
    print(solve())
