def solve():
    candidates = {
        1: (4, 3),
        2: (6, 2),
        3: (3, 4),
        4: (5, 3)
    }
    best_key = None
    best_total = -1
    for key, (x, y) in candidates.items():
        if 2*x + 3*y <= 18 and x + 2*y <= 10 and x >= 2:
            total = x + y
            if total > best_total:
                best_total = total
                best_key = key
    assert best_key == 2
    return {"value": best_total, "option_key": best_key}

if __name__ == "__main__":
    print(solve())
