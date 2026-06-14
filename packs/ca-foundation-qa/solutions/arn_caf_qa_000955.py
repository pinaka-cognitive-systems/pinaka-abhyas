from itertools import permutations


def solve():
    lines = [
        ({"deep", "blue", "river"}, {"ta", "no", "ri"}),
        ({"river", "flows", "fast"}, {"ri", "ka", "su"}),
        ({"blue", "fast", "morning"}, {"no", "su", "lo"}),
    ]
    words = sorted(set().union(*[w for w, _ in lines]))
    codes = sorted(set().union(*[c for _, c in lines]))

    valid = []
    for perm in permutations(codes):
        mapping = dict(zip(words, perm))
        if all({mapping[w] for w in ws} == cs for ws, cs in lines):
            valid.append(mapping)
    assert len(valid) == 1, "expected a unique code mapping"
    code = valid[0]["flows"]
    assert code == "ka"

    option_for = {"ka": 1, "ri": 2, "su": 3, "lo": 4}
    return {"value": code, "option_key": option_for[code]}


if __name__ == "__main__":
    print(solve())
