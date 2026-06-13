def solve():
    import math
    from itertools import permutations

    digits = [1, 1, 2, 2, 3]
    # Enumerate all distinct permutations
    all_perms = set(permutations(digits))
    # Filter even numbers (last digit even, i.e. == 2)
    even_perms = [p for p in all_perms if p[-1] % 2 == 0]
    value = len(even_perms)
    # value == 12
    option_key = 1
    return {"value": value, "option_key": option_key}

if __name__ == "__main__":
    print(solve())
