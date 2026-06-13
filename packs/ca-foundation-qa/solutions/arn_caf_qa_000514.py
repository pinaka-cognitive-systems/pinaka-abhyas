def solve():
    A = {2, 3, 5, 7}  # primes less than 10
    B = {1, 3, 5, 7, 9}  # odd numbers less than 10
    diff = A - B  # {2}
    # option 1 = {2}
    return {"value": sorted(diff), "option_key": 1}

if __name__ == "__main__":
    print(solve())
