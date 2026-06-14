from itertools import permutations


def solve():
    lines = [
        ({"green", "tall", "trees"}, {"ri", "se", "po"}),
        ({"trees", "give", "shade"}, {"po", "du", "mi"}),
        ({"shade", "cool", "green"}, {"mi", "va", "ri"}),
    ]
    words = sorted(set().union(*[w for w, _ in lines]))
    codes = sorted(set().union(*[c for _, c in lines]))

    valid = []
    for perm in permutations(codes):
        mapping = dict(zip(words, perm))
        if all({mapping[w] for w in ws} == cs for ws, cs in lines):
            valid.append(mapping)
    assert len(valid) == 1, "expected a unique code mapping"
    code = valid[0]["cool"]
    assert code == "va"

    option_for = {"va": 1, "ri": 2, "mi": 3, "se": 4}
    return {"value": code, "option_key": option_for[code]}


if __name__ == "__main__":
    print(solve())
