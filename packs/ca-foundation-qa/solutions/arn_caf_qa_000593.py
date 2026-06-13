def solve():
    groups = [
        {"key": 1, "text": "ACE"},
        {"key": 2, "text": "BDF"},
        {"key": 3, "text": "CEG"},
        {"key": 4, "text": "EGH"}
    ]
    def get_gaps(s):
        positions = [ord(c) - ord('A') + 1 for c in s]
        return [positions[i+1] - positions[i] for i in range(len(positions)-1)]

    def is_uniform_gap(s, gap=2):
        return all(g == gap for g in get_gaps(s))

    non_uniform = [g for g in groups if not is_uniform_gap(g["text"], 2)]
    assert len(non_uniform) == 1, f"Expected exactly one non-uniform group, got {[g['text'] for g in non_uniform]}"
    result = non_uniform[0]
    return {"value": result["text"], "option_key": result["key"]}

if __name__ == "__main__":
    print(solve())
