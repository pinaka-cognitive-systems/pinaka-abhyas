def solve():
    # mother = 9k, daughter = 4k; 5 years later ratio = 2:1
    # 9k + 5 = 2*(4k + 5) = 8k + 10 => k = 5
    k = 5
    mother = 9 * k  # 45
    return {"value": mother, "option_key": 2}

if __name__ == "__main__":
    print(solve())
