def solve():
    # Veena's maternal uncle = mother's brother
    # Uncle's daughter = Veena's first cousin (maternal)
    # Cousin's son = Veena's cousin's son
    # Brother of cousin's son = also Veena's cousin's son
    # Cousin's son = option 1
    return {"value": "Cousin's son", "option_key": 1}

if __name__ == "__main__":
    print(solve())
