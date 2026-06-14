from itertools import permutations


def solve():
    # Each line: (set of words, set of codes), codes scrambled relative to words.
    lines = [
        ({"bright", "shining", "stars"}, {"fa", "lo", "ka"}),
        ({"stars", "are", "distant"}, {"ka", "mi", "ne"}),
        ({"distant", "bright", "moon"}, {"ne", "fa", "zu"}),
    ]
    words = sorted(set().union(*[w for w, _ in lines]))
    codes = sorted(set().union(*[c for _, c in lines]))

    valid = []
    for perm in permutations(codes):
        mapping = dict(zip(words, perm))  # word -> code
        if all({mapping[w] for w in ws} == cs for ws, cs in lines):
            valid.append(mapping)
    assert len(valid) == 1, "expected a unique code mapping"
    code = valid[0]["shining"]
    assert code == "lo"

    option_for = {"lo": 1, "ka": 2, "fa": 3, "mi": 4}
    return {"value": code, "option_key": option_for[code]}


if __name__ == "__main__":
    print(solve())
