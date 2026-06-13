def solve():
    from itertools import permutations

    # Enumerate all permutations of CREAM in sorted order
    word = "CREAM"
    all_perms = sorted(set("".join(p) for p in permutations(word)))
    value = all_perms.index(word) + 1
    # value = 45
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
