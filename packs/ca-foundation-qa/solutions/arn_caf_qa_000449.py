import math


def solve():
    # 9 books: 4 identical novels, 3 identical textbooks, 2 identical dictionaries
    # Distinct arrangements = 9! / (4! x 3! x 2!)
    n = 9
    groups = [4, 3, 2]
    numerator = math.factorial(n)
    denominator = 1
    for g in groups:
        denominator *= math.factorial(g)
    value = numerator // denominator
    # value == 1260 -> option_key 1
    return {"value": value, "option_key": 1}


if __name__ == "__main__":
    print(solve())
