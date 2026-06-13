def solve():
    triples = [
        {"key": 1, "a": 2, "b": 3, "c": 13},
        {"key": 2, "a": 3, "b": 4, "c": 25},
        {"key": 3, "a": 4, "b": 5, "c": 41},
        {"key": 4, "a": 5, "b": 6, "c": 60}
    ]
    # Rule: c = a^2 + b^2
    def follows_rule(t):
        return t["c"] == t["a"]**2 + t["b"]**2

    non_conforming = [t for t in triples if not follows_rule(t)]
    assert len(non_conforming) == 1, f"Expected exactly one non-conforming triple, got {[(t['a'],t['b'],t['c']) for t in non_conforming]}"
    result = non_conforming[0]
    return {"value": (result["a"], result["b"], result["c"]), "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
