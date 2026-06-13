def solve():
    pairs = [
        {"key": 1, "a": 5, "b": 26},
        {"key": 2, "a": 7, "b": 50},
        {"key": 3, "a": 9, "b": 82},
        {"key": 4, "a": 11, "b": 121}
    ]
    # Rule: b = a^2 + 1
    def follows_rule(p):
        return p["b"] == p["a"]**2 + 1

    non_conforming = [p for p in pairs if not follows_rule(p)]
    assert len(non_conforming) == 1, f"Expected exactly one non-conforming pair, got {[(p['a'], p['b']) for p in non_conforming]}"
    result = non_conforming[0]
    return {"value": (result["a"], result["b"]), "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
