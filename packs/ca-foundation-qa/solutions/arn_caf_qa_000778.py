def solve():
    from itertools import permutations
    digits = [1, 2, 3, 4]
    all_perms = list(permutations(digits))
    total = len(all_perms)  # 24

    favourable = 0
    for perm in all_perms:
        number = perm[0]*1000 + perm[1]*100 + perm[2]*10 + perm[3]
        if number % 4 == 0:
            favourable += 1

    # favourable should be 6
    assert total == 24
    assert favourable == 6
    prob = favourable / total  # 1/4
    return {"value": prob, "option_key": 1}

if __name__ == "__main__":
    print(solve())
