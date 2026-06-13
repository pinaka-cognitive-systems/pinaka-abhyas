def solve():
    groups = [
        {"key": 1, "label": "P", "a": 3, "b": 5, "c": 34, "d": 16},
        {"key": 2, "label": "Q", "a": 2, "b": 6, "c": 40, "d": 12},
        {"key": 3, "label": "R", "a": 4, "b": 7, "c": 65, "d": 28},
        {"key": 4, "label": "S", "a": 5, "b": 8, "c": 89, "d": 40}
    ]
    # Rule 1: c = a^2 + b^2
    # Rule 2: d = a * b
    def follows_both_rules(g):
        rule1 = (g["c"] == g["a"]**2 + g["b"]**2)
        rule2 = (g["d"] == g["a"] * g["b"])
        return rule1 and rule2

    non_conforming = [g for g in groups if not follows_both_rules(g)]
    assert len(non_conforming) == 1, f"Expected exactly one non-conforming group, got {[g['label'] for g in non_conforming]}"
    result = non_conforming[0]
    return {"value": "Group " + result["label"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
