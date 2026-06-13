def solve():
    candidates = {1: (3, 3), 2: (5, 2), 3: (2, 7), 4: (4, 4)}
    for key, (x, y) in candidates.items():
        if 2*x + y <= 10 and x + 3*y <= 12:
            return {"value": key, "option_key": key}
    return None

if __name__ == "__main__":
    print(solve())
