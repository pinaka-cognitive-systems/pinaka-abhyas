def solve():
    mean = 24.5
    median = 26.1
    # Karl Pearson's empirical relation
    mode = 3 * median - 2 * mean
    mode = round(mode, 1)
    options = {1: 29.3, 2: 27.7, 3: 52.2, 4: 31.3}
    option_key = min(options, key=lambda k: abs(options[k] - mode))
    return {"value": mode, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
